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

/** يحمّل نواة WASM — يتم مرة واحدة لكل جلسة */
export async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    // ملف الـ wasm يُنسخ إلى public/sql-wasm/ ويُحمَّل من نفس أصل الموقع،
    // فيعمل التطبيق أوفلاين بالكامل بعد أول زيارة.
    // المسار قابل للتجاوز لأغراض الاختبار خارج المتصفح فقط
    const base = (globalThis as { __PLUS_WASM_BASE__?: string }).__PLUS_WASM_BASE__ || '/sql-wasm/';
    SQL = await initSqlJs({ locateFile: (file: string) => `${base}${file}` });
  }
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
