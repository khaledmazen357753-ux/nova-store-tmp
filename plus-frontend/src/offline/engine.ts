/**
 * تشغيل «العقل المحاسبي» داخل المتصفح.
 *
 * هذا الملف هو نقطة الالتقاء بين:
 *   • قاعدة بيانات SQLite حقيقية في المتصفح (sql.js + IndexedDB)
 *   • نفس كود الخادم المحاسبي (accountingEngine + routes/*.js + seedDatabase)
 *
 * ويقدّم للمتصفح نفس شكل REST API الذي تستهلكه الواجهة، فيعمل النظام
 * كاملاً أوفلاين: يحسب القيود، يرحّل الفواتير، يقفل الفترات، ويولّد
 * التقارير — كل ذلك محلياً على الجهاز بلا أي اتصال.
 */

import { SCHEMA_SQL, ACCOUNTING_ENGINE_SOURCE, SERVER_BUNDLE } from '../generated/engineBundle';
import { createOfflineDb, storedBytes, loadSqlJs, type OfflineDb } from './db';
import {
  BackupError,
  inspectSqliteFile,
  incompatibilityMessage,
  type SqliteFileInfo,
} from './sqliteFile';
import { createExpressStub, dispatch as bridgeDispatch, type RouterRecord } from './bridge';
import * as cryptoTools from './sha256';
import { getDeviceTag, claimWriteLock, isWriterTab, onBecomeWriter } from './tabLock';

/** الواجهة التي تعرضها حزمة الخادم بعد التحميل */
interface ServerBundle {
  seedDatabase(db: OfflineDb): void;
  createAuthRouter(db: OfflineDb, authenticate: unknown): unknown;
  createMasterRouter(db: OfflineDb, authenticate: unknown): unknown;
  createTransactionsRouter(db: OfflineDb, authenticate: unknown): unknown;
  createReportsRouter(db: OfflineDb, authenticate: unknown): unknown;
  createAdminRouter(db: OfflineDb, authenticate: unknown): unknown;
  createChangeRequestRouter(
    db: OfflineDb,
    authenticate: unknown,
    deps: { requirePermission: unknown; requireSuperAdmin: unknown }
  ): unknown;
  auth: Record<string, unknown>;
}

export interface OfflineEngineState {
  db: OfflineDb;
  routers: RouterRecord[];
  engine: Record<string, unknown>;
  auth: Record<string, (...args: unknown[]) => unknown>;
  meta: {
    tables: number;
    routes: number;
    isNew: boolean;
    builtAt: string;
    seedBytes: number;
  };
}

let state: OfflineEngineState | null = null;
let initPromise: Promise<OfflineEngineState> | null = null;

/**
 * 1) يحمّل `plus-backend/src/accountingEngine.js` **كنص أصلي** وينفّذه.
 *    نفس الملف، نفس الدوال، بلا أي تعديل — هذه هي الحسبة المحاسبية الحقيقية.
 */
function loadAccountingEngine(): Record<string, unknown> {
  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('module', 'exports', ACCOUNTING_ENGINE_SOURCE);
  factory(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

/** 2) ينفّذ حزمة الخادم (db + auth + routes) التي بُنيت خصيصاً للمتصفح */
function loadServerBundle(): ServerBundle {
  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('module', 'exports', SERVER_BUNDLE);
  factory(moduleObj, moduleObj.exports);
  return moduleObj.exports as unknown as ServerBundle;
}

/**
 * يهيّئ النظام الأوفلاين بالكامل. آمن للاستدعاء أكثر من مرة:
 * التهيئة تحدث مرة واحدة فقط ويُعاد نفس الوعد بعدها.
 */
export async function initOfflineEngine(): Promise<OfflineEngineState> {
  if (state) return state;
  if (initPromise) return initPromise;

  // سقف زمني للتهيئة كلها.
  //
  // بدونه، أي انتظار لا ينتهي (شبكة نصف مفتوحة، IndexedDB معلّق، متصفح يوقف
  // المؤقتات) يجعل شاشة "جارٍ تشغيل محرك الحسابات…" تدور للأبد. المستخدم
  // رأى هذا فعلاً في الإنتاج. الخطأ الواضح أفضل ألف مرة من الدوران الصامت،
  // خصوصاً أن حلقة `plusBootSpin` في الصفحة لا تنتهي بذاتها.
  const INIT_DEADLINE_MS = 45000;
  const deadline = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `تعذّر إكمال تشغيل محرك الحسابات خلال ${INIT_DEADLINE_MS / 1000} ثانية. ` +
            'قد تكون الشبكة بطيئة عند تحميل ملف قاعدة البيانات لأول مرة. ' +
            'أعد تحميل الصفحة، وإن تكرر الأمر فامسح الكاش.'
        )
      );
    }, INIT_DEADLINE_MS);
  });

  initPromise = (async () => {
    const started = performance.now();

    // ── أ) حقن بدائل المتصفح قبل تحميل أي كود خادم ─────────────
    const registry: RouterRecord[] = [];
    const expressStub = createExpressStub(registry);

    const g = globalThis as Record<string, unknown>;
    g.__PLUS_CRYPTO__ = cryptoTools;
    g.__PLUS_EXPRESS__ = expressStub;
    g.__PLUS_SCHEMA_SQL__ = SCHEMA_SQL;

    // ── ب) تحميل كود الخادم ────────────────────────────────────
    const server = loadServerBundle();
    const engine = loadAccountingEngine();

    // رمز الجهاز: يجعل أرقام المستندات فريدة لكل متصفح، فلا تتصادم عند
    // المزامنة مستقبلاً. لا أثر له في الوضع السحابي.
    const setDeviceTag = engine.setDeviceTag as ((tag: string | null) => void) | undefined;
    if (typeof setDeviceTag === 'function') setDeviceTag(getDeviceTag());

    if (typeof server.seedDatabase !== 'function') {
      throw new Error('حزمة الخادم لا تحتوي على دالة الزراعة — أعد بناء الحزمة');
    }

    // ── ج) قاعدة البيانات: تُبنى من المخطط الأصلي وتُزرع ببيانات الخادم ──
    const { db, isNew } = await createOfflineDb(SCHEMA_SQL, (freshDb) => {
      server.seedDatabase(freshDb);
    });

    // ── د) قفل الكتابة: تبويب واحد فقط يكتب ──────────────────────
    // بدونه يحفظ تبويبان صورتهما الكاملة للقاعدة فوق بعضهما فيضيع عمل أحدهما.
    // النداء هنا *بعد* إنشاء القاعدة لأنه قد يولّد رمز الجهاز.
    await claimWriteLock();

    // إن صرنا كاتبات لاحقاً (أُغلق التبويب الكاتب) نعيد التحميل لنقرأ عمله
    onBecomeWriter(() => {
      window.location.reload();
    });

    // ── هـ) تركيب الراوترات بنفس ترتيب server.js ────────────────
    const auth = server.auth as unknown as Record<string, (...args: unknown[]) => unknown>;
    const authenticate = auth.createAuthMiddleware(db);
    const mounted: RouterRecord[] = [];

    expressStub.__setPrefix('/api/auth');
    server.createAuthRouter(db, authenticate);

    const mount = (prefix: string, factory: (d: OfflineDb, a: unknown) => unknown) => {
      expressStub.__setPrefix(prefix);
      factory(db, authenticate);
    };
    mount('/api/master', server.createMasterRouter);
    mount('/api/transactions', server.createTransactionsRouter);
    mount('/api/reports', server.createReportsRouter);
    mount('/api/admin', server.createAdminRouter);

    // طلبات التعديل على البيانات الرئيسية — (ج) تعديلات بموافقة المدير.
    //
    // نفس تعريف requireSuperAdmin المستخدم في admin.js بالحرف: الوحيدة
    // الفارق أن هذا يعيد توجيه رسالة عربية خاصة بالطلبات بدل الرسالة
    // العامة. الأثر الأمني متطابق، والوحدة نفسها مُحزَّمة من كود الخادم
    // دون أي تعديل.
    const requireSuperAdmin = (rq: unknown, rs: unknown, next: () => void) => {
      const user = (rq as { user?: { role_code?: string } }).user;
      if (!user || user.role_code !== 'SUPER_ADMIN') {
        (rs as { status: (c: number) => { json: (b: unknown) => void } })
          .status(403)
          .json({ error: 'اعتماد أو رفض طلبات التعديل يقتصر على مدير النظام الأعلى (SUPER_ADMIN).' });
        return;
      }
      next();
    };
    expressStub.__setPrefix('/api/change-requests');
    server.createChangeRequestRouter(db, authenticate, {
      requirePermission: (auth as Record<string, unknown>).requirePermission,
      requireSuperAdmin,
    });

    mounted.push(...registry);
    const routes = mounted.reduce((sum, r) => sum + r.routes.length, 0);

    state = {
      db,
      routers: mounted,
      engine,
      auth,
      meta: {
        tables: (SCHEMA_SQL.match(/CREATE TABLE/gi) || []).length,
        routes,
        isNew,
        builtAt: new Date().toISOString(),
        seedBytes: await storedBytes(),
      },
    };

    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.info(
        `[Plus Offline] ${state.meta.tables} جدول · ${routes} مسار · ${Math.round(
          performance.now() - started
        )}ms${isNew ? ' (بنية جديدة)' : ' (بيانات محفوظة)'}`
      );
    }

    return state;
  })();

  try {
    // `Promise.race` مع الخطأ: أي منهما ينتهي أولاً يحسم النتيجة.
    // المهم أن الفشل يُعيد تصفير `initPromise` حتى تنجح محاولة لاحقة —
    // وعد مرفوض عالق كان سيجعل كل زر "إعادة المحاولة" يفشل فوراً بنفس الخطأ.
    return await Promise.race([initPromise, deadline]);
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

/**
 * هل يمكن الكتابة من هذا التبويب؟
 * التبويبات غير النشطة تفتح للعرض فقط لحماية البيانات من الضياع.
 */
export function canWrite(): boolean {
  return isWriterTab();
}

/** يعيد حالة النظام بعد التهيئة (أو null) */
export function offlineState() {
  return state;
}

/** يحفظ القاعدة يدوياً على القرص */
export async function persistNow() {
  await state?.db.persist();
}

/** حجم البيانات المحفوظة على الجهاز */
export async function offlineStorageBytes() {
  return storedBytes();
}

// ═══════════════════════════════════════════════════════════════════
// النسخ الاحتياطي الثنائي (ملف .sqlite حقيقي)
// ═══════════════════════════════════════════════════════════════════

/**
 * يصدّر القاعدة الحالية كملف SQLite ثنائي.
 * يعمل حتى لو لم تكن هناك تهيئة بعد — نطلبها أولاً لضمان وجود قاعدة.
 */
export async function exportSqliteFile(): Promise<Uint8Array> {
  const st = state ?? (await initOfflineEngine());
  // حفظ أي تغييرات معلّقة قبل التصدير حتى لا تخرج نسخة ناقصة
  await st.db.persist();
  return st.db.exportFile();
}

/** أسماء جداول النظام الحالي — أساس المقارنة عند الاستعادة */
function currentTableNames(): string[] {
  if (!state) return [];
  try {
    const res = state.db.sqlite.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    return res.length ? res[0].values.map((row) => String(row[0])) : [];
  } catch {
    return [];
  }
}

/**
 * يفحص ملفاً مرفوعاً **دون أي كتابة**.
 * هذه هي بوابة الثقة: تُستدعى عند اختيار الملف، ويُعرض تقريرها للمستخدم
 * قبل أن يقرّر. لا يُكتب بايت واحد قبل موافقته الصريحة.
 */
export async function previewSqliteFile(
  bytes: Uint8Array
): Promise<{ info: SqliteFileInfo; problem: string | null }> {
  const st = state ?? (await initOfflineEngine());
  await st.db.persist();

  const sql = await loadSqlJs();
  const info = inspectSqliteFile(
    sql.Database as unknown as new (data?: Uint8Array) => unknown,
    bytes,
    currentTableNames()
  );
  return { info, problem: incompatibilityMessage(info) };
}

/**
 * يستبدل القاعدة الحالية بالملف — بعد أن يكون قد اجتاز `previewSqliteFile`.
 *
 * نعيد الفحص هنا من جديد رغم أنه تم في المعاينة، لأن بين اللحظتين قد تمرّ
 * دقائق. الفحص رخيص (بضع مللي ثوانٍ) والاستعادة الخاطئة مكلفة.
 */
export async function restoreSqliteFile(
  bytes: Uint8Array
): Promise<{ tables: number; rows: number }> {
  const st = state ?? (await initOfflineEngine());

  const sql = await loadSqlJs();
  const info = inspectSqliteFile(
    sql.Database as unknown as new (data?: Uint8Array) => unknown,
    bytes,
    currentTableNames()
  );

  const problem = incompatibilityMessage(info);
  if (problem) throw new BackupError(problem, 'INCOMPATIBLE');

  await st.db.replaceWithFile(bytes);

  // نعيد تهيئة الحالة الداخلية حتى لا تظل القاعدة القديمة في الذاكرة
  state = null;
  initPromise = null;

  return { tables: info.tables, rows: info.rows };
}

/** يمسح كل البيانات ويعيد النظام لحالته الأولى */
export async function resetOfflineData() {
  await state?.db.reset();
  state = null;
  initPromise = null;
  window.location.reload();
}
