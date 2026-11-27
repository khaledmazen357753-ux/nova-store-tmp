/**
 * نسخ احتياطي ثنائي — ملف قاعدة بيانات SQLite حقيقي (.sqlite)
 *
 * ─ لماذا هذا الملف موجود؟ ────────────────────────────────────────────
 * النسخة الاحتياطية الحالية بصيغة JSON، وهي جيدة لكن لها حدود جوهرية:
 *   • تعتمد على تطابق المخطط بين النسختين (لا تعمل بعد تحديث بنية الجداول)
 *   • تمرّ عبر طبقة REST، فتُعيد بناء البيانات صفاً صفاً
 *   • لا تصلح لفتحها ببرامج SQLite المعتادة (DB Browser، sqlite3 CLI)
 *
 * ملف `.sqlite` ثنائي يحلّ الثلاثة: هو القاعدة نفسها، بايتاً ببايت.
 * تفتحه بأي أداة، وتعيده إلى النظام في أي وقت، ويعمل حتى لو تغيّر المخطط
 * لاحقاً (نرفض النسخ غير المتوافقة برسالة واضحة بدل بيانات مشوّهة).
 *
 * ─ قرارات تصميم اتُّخذت عن قصد ───────────────────────────────────────
 *
 * 1) **القراءة قبل الكتابة.** الاستعادة تُحلّل الملف وتتحقق منه بالكامل في
 *    قاعدة مؤقتة منفصلة. لا يُمسّ الملف المحفوظ إلا بعد نجاح كل الفحوص.
 *    استعادة نصف ناجحة أسوأ من عدم الاستعادة.
 *
 * 2) **فحص البصمة السحرية.** أول 16 بايتاً في كل ملف SQLite هي
 *    "SQLite format 3\0". نرفض ما دونها قبل أن نمرّرها إلى المحرّك.
 *
 * 3) **فحص التكامل (`PRAGMA integrity_check`).** كشف مبكر للبايتات التالفة.
 *    ملف منزّل جزئياً (نفس عطل wasm الذي أرهقنا) يفشل هنا برسالة مفهومة
 *    بدل أن يفتح قاعدة تبدو سليمة وتفقد صفوفاً بصمت.
 *
 * 4) **فحص التطابق مع المخطط الحالي.** نقرأ `sqlite_master` من الملف
 *    ومن القاعدة الحالية ونقارن أسماء الجداول. نسخة من إصدار آخر تُرفض
 *    ترفيضاً صريحاً بدل استعادة تجعل النظام يرمي أخطاء لاحقاً.
 *
 * 5) **السلامة المرجعية بعد الاستعادة.** `PRAGMA foreign_key_check`
 *    قبل الحفظ. نسخة بحقول مرتبطة مكسورة تعني تقارير محاسبية خاطئة.
 */

/** البصمة السحرية التي تبدأ بها كل ملفات SQLite */
const SQLITE_MAGIC = 'SQLite format 3\0';

/** الحد الأدنى لحجم ملف SQLite صالح — رأس 100 بايت + صفحة واحدة على الأقل */
const MIN_SQLITE_BYTES = 512;

export interface SqliteFileInfo {
  /** حجم الملف بالبايت */
  bytes: number;
  /** عدد الجداول (بلا جداول SQLite الداخلية) */
  tables: number;
  /** عدد الصفوف الإجمالي */
  rows: number;
  /** أسماء الجداول — للعرض في تقرير المعاينة */
  tableNames: string[];
  /** هل الملف من إصدار مختلف عن النظام الحالي؟ */
  compatible: boolean;
  /** جداول موجودة في الملف وغائبة عن النظام الحالي */
  missingTables: string[];
  /** جداول في النظام الحالي وغائبة عن الملف */
  extraTables: string[];
}

/** خطأ يحمل رسالة عربية موجّهة للمستخدم — لا نعرض أخطاء المحرّك الخام */
export class BackupError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'BackupError';
  }
}

/** يتحقق أن البايتات تبدأ ببصمة SQLite — قبل أي محاولة فتح */
export function looksLikeSqlite(bytes: Uint8Array): boolean {
  if (!bytes || bytes.byteLength < MIN_SQLITE_BYTES) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i += 1) {
    if (bytes[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/** ينسخ مصفوفة بايتات إلى Uint8Array مستقلّة تماماً */
function toUint8(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

/** أسماء الجداول الحقيقية فقط — نستثني جداول SQLite الداخلية */
function tableNamesOf(db: { exec(sql: string): QueryExecResult[] }): string[] {
  const res = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  if (!res.length) return [];
  return res[0].values.map((row) => String(row[0]));
}

interface QueryExecResult {
  columns: string[];
  values: unknown[][];
}

/** يقرأ رقماً واحداً من استعلام — مع بديل عند الفشل */
function scalar(db: { exec(sql: string): QueryExecResult[] }, sql: string, fallback: number): number {
  try {
    const res = db.exec(sql);
    const v = res?.[0]?.values?.[0]?.[0];
    return v === undefined || v === null ? fallback : Number(v);
  } catch {
    return fallback;
  }
}

/**
 * يفحص ملف SQLite **داخل قاعدة مؤقتة معزولة** دون أن يلمس القاعدة الحيّة.
 * هذه هي بوابة الثقة: كل استعادة تمرّ من هنا أولاً.
 *
 * @param SqlDatabase منشئ `sql.js`
 * @param bytes بايتات الملف المرفوع
 * @param currentTableNames جداول النظام الحالي — للمقارنة
 */
export function inspectSqliteFile(
  SqlDatabase: new (data?: Uint8Array) => unknown,
  bytes: Uint8Array,
  currentTableNames: string[]
): SqliteFileInfo {
  // ── 1) البصمة السحرية قبل أي شيء آخر ──────────────────────────────
  if (!looksLikeSqlite(bytes)) {
    throw new BackupError(
      bytes.byteLength < MIN_SQLITE_BYTES
        ? `الملف صغير جداً (${bytes.byteLength} بايت) — يبدو أنه لم يكتمل تنزيله. أعد تنزيل النسخة الاحتياطية وجرّب مرة أخرى.`
        : 'الملف ليس قاعدة بيانات SQLite صالحة. تأكد أنك تختار ملفاً ينتهي بـ «.sqlite» أو «.db»، وليس نسخة JSON.',
      'NOT_SQLITE'
    );
  }

  let tmp: { exec(sql: string): QueryExecResult[]; close(): void };
  try {
    tmp = new SqlDatabase(bytes) as unknown as typeof tmp;
  } catch (err) {
    throw new BackupError(
      `تعذّر فتح الملف كقاعدة بيانات SQLite. قد يكون تالفاً أو من إصدار غير مدعوم. (${err instanceof Error ? err.message : String(err)})`,
      'OPEN_FAILED'
    );
  }

  try {
    return inspectOpened(tmp, bytes, currentTableNames);
  } catch (err) {
    // sql.js يكتشف التلف **كسولاً** — عند أول قراءة فعلية لا عند الفتح.
    // فيرمي `SQLITE_CORRUPT` برسالة إنجليزية خام. من هنا كانت تتسرّب إلى
    // المستخدم بدل الرسالة العربية. نلتقط كل ما ليس BackupError ونحوّله.
    if (err instanceof BackupError) throw err;
    const raw = err instanceof Error ? err.message : String(err);
    throw new BackupError(
      /CORRUPT|malformed|not a database/i.test(raw)
        ? `الملف تالف أو لم يكتمل تنزيله (${raw.slice(0, 60)}). أعد تنزيل النسخة الاحتياطية وجرّب مرة أخرى.`
        : `تعذّر قراءة الملف: ${raw.slice(0, 100)}`,
      'CORRUPT'
    );
  } finally {
    try {
      tmp.close();
    } catch {
      /* القاعدة المؤقتة تُترك للجامع إن رفض المحرّك الإغلاق */
    }
  }
}

/**
 * الفحص الفعلي بعد نجاح الفتح — منفصل حتى يبقى `try/finally` في الأعلى
 * بسيطاً وقادراً على تحويل أي خطأ خام إلى رسالة عربية.
 */
function inspectOpened(
  tmp: { exec(sql: string): QueryExecResult[] },
  bytes: Uint8Array,
  currentTableNames: string[]
): SqliteFileInfo {
  // ── 2) التكامل: هل البايتات كاملة؟ ──────────────────────────────
  const integrity = tmp.exec('PRAGMA integrity_check');
  const integrityValue = integrity?.[0]?.values?.[0]?.[0];
  if (integrityValue !== 'ok') {
    throw new BackupError(
      `الملف تالف — فحص السلامة أعاد: «${String(integrityValue).slice(0, 80)}». غالباً لم يكتمل تنزيله. أعد تنزيل النسخة الاحتياطية.`,
      'CORRUPT'
    );
  }

  // ── 3) السلامة المرجعية — قبل أن نعتمد النسخة ───────────────────
  const fkIssues = tmp.exec('PRAGMA foreign_key_check');
  if (fkIssues.length && fkIssues[0].values.length > 0) {
    throw new BackupError(
      `الملف يحتوي ${fkIssues[0].values.length} صفاً مرتبطاً بسجل غير موجود — الاستعادة ستُفسد التقارير. الملف غير صالح للاستخدام.`,
      'FK_BROKEN'
    );
  }

  // ── 4) المطابقة مع النظام الحالي ────────────────────────────────
  const fileTables = tableNamesOf(tmp as unknown as { exec(sql: string): QueryExecResult[] });
  const current = new Set(currentTableNames);
  const inFile = new Set(fileTables);

  const missingTables = fileTables.filter((t) => !current.has(t));
  const extraTables = currentTableNames.filter((t) => !inFile.has(t));
  const compatible = missingTables.length === 0 && extraTables.length === 0;

  // ── 5) إحصاء الصفوف لكل جدول ────────────────────────────────────
  let rows = 0;
  for (const name of fileTables) {
    // الأسماء تأتي من sqlite_master نفسه، والأقواس المزدوجة تمنع أي حقن
    rows += scalar(tmp as unknown as { exec(sql: string): QueryExecResult[] },
      `SELECT COUNT(*) FROM "${name.replace(/"/g, '""')}"`, 0);
  }

  return {
    bytes: bytes.byteLength,
    tables: fileTables.length,
    rows,
    tableNames: fileTables,
    compatible,
    missingTables,
    extraTables,
  };
}

/**
 * يبني رسالة رفض واضحة عندما تكون النسخة من إصدار آخر.
 * منفصلة عن الفحص حتى تُستدعى عند العرض فقط (المعاينة تُظهر المشكلة قبل
 * أن يضغط المستخدم «استعادة» — لا مفاجآت).
 */
export function incompatibilityMessage(info: SqliteFileInfo): string | null {
  if (info.compatible) return null;

  const parts: string[] = [];
  if (info.missingTables.length) {
    parts.push(
      `النسخة تحتوي جداول غير موجودة في النظام الحالي: ${info.missingTables.slice(0, 5).join('، ')}`
    );
  }
  if (info.extraTables.length) {
    parts.push(
      `النظام الحالي يحتوي جداول غائبة عن النسخة: ${info.extraTables.slice(0, 5).join('، ')}`
    );
  }
  return `${parts.join(' · ')}. النسخة من إصدار مختلف — استخدم نسخة JSON أو حدّث النظام أولاً.`;
}

/** اسم ملف مقترح — التاريخ بصيغة ISO يفرز تصاعدياً بشكل صحيح */
export function suggestedFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `plus-erp-${stamp}.sqlite`;
}
