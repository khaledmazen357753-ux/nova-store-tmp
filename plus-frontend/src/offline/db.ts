/**
 * محول SQLite داخل المتصفح.
 *
 * الغرض: تشغيل **نفس كود الخادم** (accountingEngine.js + routes/*.js) داخل
 * المتصفح بدون أي تغيير، عبر تقديم نفس الواجهة التي كان يستخدمها
 * `node:sqlite` / `libsql`:
 *
 *     db.exec(sql)
 *     db.prepare(sql).get(...) / .all(...) / .run(...)
 *
 * كلها متزامنة كما هي، لأن sql.js يعمل في الذاكرة.
 *
 * التخزين الدائم: قاعدة sql.js تعيش في الذاكرة، فيُصدَّر الملف كاملاً
 * (Uint8Array) ويُحفظ في IndexedDB بعد كل تعديل — فيبقى كل شيء عند إغلاق
 * المتصفح، ولا يضيع أي قيد أو فاتورة.
 */

import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';

const DB_NAME = 'plus_erp_offline';
const STORE = 'sqlite';
const FILE_KEY = 'plus_erp.sqlite';

let SQL: SqlJsStatic | null = null;

/** يفتح IndexedDB (بديل دائم لـ localStorage الذي سعته 5 ميجا فقط) */
function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE)) idb.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** يقرأ حجم الملف المحفوظ بالبايت (لعرضه في شاشة الإعدادات) */
export async function storedBytes(): Promise<number> {
  try {
    const data = await idbGet(FILE_KEY);
    return data ? data.byteLength : 0;
  } catch {
    return 0;
  }
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface OfflineDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
  /** يحفظ القاعدة على القرص (IndexedDB) */
  persist(): Promise<void>;
  /** حجم القاعدة الحالي بالبايت */
  size(): number;
  /** يحذف كل البيانات ويعيد البناء من الصفر */
  reset(): Promise<void>;
  readonly sqlite: SqlJsDatabase;
}

/**
 * هل هذه البايتات ملف WebAssembly فعلاً؟
 *
 * كل ملفات wasm تبدأ بالبصمة السحرية 0x00 0x61 0x73 0x6d ("\0asm").
 */
function looksLikeWasmBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d
  );
}

/**
 * يحمّل ملف الـ wasm بنفسه بدل ترك sql.js يجريه.
 *
 * السبب: كان العطل القاتل أن Service Worker (من إصدار قديم) يقدّم صفحة
 * HTML مكان الملف الثنائي من الكاش. وحتى بعد إصلاح الكاش، يبقى المستخدمون
 * الذين عندهم الإصدار القديم محتجَزين. تحميل البايتات هنا مباشرة — مع
 * تجاوز أي Service Worker وفحص البصمة السحرية — يعالج السبب لا العَرَض،
 * ويعمل حتى لو كان الكاش القديم ما زال مسيطراً.
 */
async function fetchWasmBytes(url: string): Promise<Uint8Array> {
  // خارج المتصفح (اختبارات Node) لا يوجد fetch لمسارات file:// — نقرأ
  // الملف مباشرة. هذا المسار لا يُستخدم في الإنتاج إطلاقاً.
  //
  // مهم: البايتات المحقونة تمرّ بنفس الفحص. أي مسار يتخطى الفحص يصبح
  // ثغرة، وقد أثبت الاختبار ذلك: كان HTML يُقبل بلا اعتراض.
  const injected = (globalThis as { __PLUS_WASM_BYTES__?: Uint8Array }).__PLUS_WASM_BYTES__;
  if (injected) {
    if (!looksLikeWasmBytes(injected)) {
      throw new Error(
        'ملف قاعدة البيانات (WebAssembly) غير صالح: البايتات لا تحمل بصمة wasm.'
      );
    }
    return injected;
  }

  // المتصفح قد يعيد استجابة مخزَّنة من SW لا يمكن تجاوزه بالخيارات،
  // لذلك نعيد المحاولة بعد إلغاء تسجيل الـ SW إن بدت الاستجابة ملوّثة.
  const attempt = async (): Promise<Response> =>
    fetch(url, {
      cache: 'reload' as RequestCache,
      // بعض المتصفحات لا تدعم هذا الخيار لكنه لا يضر عند غيابه
      ...({ serviceWorkers: 'none' } as Record<string, unknown>),
    });

  let res = await attempt();

  let bytes = new Uint8Array(await res.arrayBuffer());

  if (!res.ok || !looksLikeWasmBytes(bytes)) {
    // شفاء ذاتي: نلغي عامل الخدمة ونمسح الكاش ثم نعيد المحاولة مرة واحدة.
    // هذا ما يحرّر المستخدم من SW قديم عالق بلا حاجة لتدخل يدوي منه.
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in globalThis) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* نكمل للمحاولة الثانية على أي حال */
    }

    res = await fetch(url, { cache: 'reload' as RequestCache });
    bytes = new Uint8Array(await res.arrayBuffer());

    if (!res.ok || !looksLikeWasmBytes(bytes)) {
      throw new Error(
        `ملف قاعدة البيانات (${url}) ليس ملف WebAssembly صالحاً. ` +
          `حالة الرد: ${res.status}. هذا يعني أن الخادم أو الكاش يقدّم صفحة HTML بدل الملف الثنائي.`
      );
    }
  }

  return bytes;
}

/** يحمّل نواة WASM — يتم مرة واحدة لكل جلسة */
export async function loadSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;

  // ملف الـ wasm يُنسخ إلى public/sql-wasm/ ويُحمَّل من نفس أصل الموقع،
  // فيعمل التطبيق أوفلاين بالكامل بعد أول زيارة.
  // المسار قابل للتجاوز لأغراض الاختبار خارج المتصفح فقط
  const base = (globalThis as { __PLUS_WASM_BASE__?: string }).__PLUS_WASM_BASE__ || '/sql-wasm/';

  SQL = await initSqlJs({
    locateFile: (file: string) => `${base}${file}`,
    // نمرّر البايتات محمّلة ومفحوصة مسبقاً — فلا يجرّب sql.js التحميل بنفسه.
    // (sql.js يطلب ArrayBuffer وليس Uint8Array.)
    wasmBinary: (await fetchWasmBytes(`${base}sql-wasm.wasm`)).buffer as ArrayBuffer,
  } as Parameters<typeof initSqlJs>[0]);

  return SQL;
}

/**
 * ينشئ محوّل قاعدة البيانات.
 * إن لم يكن هناك ملف محفوظ، ينفّذ المخطط ثم دالة الزراعة (نفس بيانات الخادم).
 */
export async function createOfflineDb(
  schemaSql: string,
  seedFn?: (db: OfflineDb) => void
): Promise<{ db: OfflineDb; isNew: boolean }> {
  const sql = await loadSqlJs();
  const existing = await idbGet(FILE_KEY);
  const isNew = !existing;

  const sqlite = existing ? new sql.Database(existing) : new sql.Database();

  const db: OfflineDb = {
    exec(sqlText: string) {
      sqlite.exec(sqlText);
    },
    prepare(sqlText: string) {
      return {
        run(...params: unknown[]): RunResult {
          // نستخدم prepare + step للحصول على last_insert_rowid بشكل صحيح
          const stmt = sqlite.prepare(sqlText);
          try {
            stmt.bind(params as never[]);
            stmt.step();
            const rowidRow = sqlite.exec('SELECT last_insert_rowid() AS r');
            const changesRow = sqlite.exec('SELECT changes() AS c');
            return {
              changes: Number(changesRow?.[0]?.values?.[0]?.[0] ?? 0),
              lastInsertRowid: Number(rowidRow?.[0]?.values?.[0]?.[0] ?? 0),
            };
          } finally {
            stmt.free();
          }
        },
        get(...params: unknown[]) {
          const stmt = sqlite.prepare(sqlText);
          try {
            stmt.bind(params as never[]);
            if (!stmt.step()) return undefined;
            return stmt.getAsObject() as Record<string, unknown>;
          } finally {
            stmt.free();
          }
        },
        all(...params: unknown[]) {
          const stmt = sqlite.prepare(sqlText);
          const rows: Record<string, unknown>[] = [];
          try {
            stmt.bind(params as never[]);
            while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
            return rows;
          } finally {
            stmt.free();
          }
        },
      };
    },
    async persist() {
      const bytes = sqlite.export();
      await idbPut(FILE_KEY, bytes);
    },
    size() {
      return sqlite.export().byteLength;
    },
    async reset() {
      await idbDelete(FILE_KEY);
    },
    sqlite,
  };

  if (isNew) {
    // sql.js يفعّل القيود المرجعية افتراضياً بينما node:sqlite لا،
    // فنوقفها أثناء بناء المخطط والزراعة لتطابق سلوك الخادم بالمليمتر.
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(schemaSql);
    if (seedFn) seedFn(db);
  }
  db.exec('PRAGMA foreign_keys = ON;');
  if (isNew) await db.persist();

  return { db, isNew };
}
