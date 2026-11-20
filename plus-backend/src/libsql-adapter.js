/**
 * طبقة توافق بين `node:sqlite` (التي كان يعتمد عليها المشروع) و libSQL.
 *
 * لماذا؟
 *   libSQL هو نفس محرك SQLite، لكن بصيغة تسمح بالاتصال بقاعدة بيانات Turso
 *   سحابية مع الحفاظ على العمل محلياً عند انقطاع الشبكة (embedded replica).
 *   واجهته متوافقة تماماً مع better-sqlite3، أي نفس الشكل الذي يستخدمه المشروع:
 *     db.exec(sql)                          → متزامن
 *     db.prepare(sql).get(...) / .all(...)  → متزامن
 *     db.prepare(sql).run(...)              → متزامن
 *
 *   لذلك لا تُلمس أي من الاستعلامات الـ 235 في routes/ و accountingEngine.js.
 *
 * الفرق الوحيد الذي نعالجه هنا:
 *   libSQL يضيف حقل `_metadata` إلى كل صف يُرجَع (لأغراض القياس).
 *   لو وصل هذا الحقل إلى رد الـ API ستتغير أشكال البيانات، لذا نزيله
 *   من كل صف قبل إرجاعه — فيبقى الشكل مطابقاً تماماً لما كان عليه.
 */

/**
 * تحميل محرك قاعدة البيانات.
 *
 * الأولوية لـ libSQL (لأنه يمنحنا Turso والاستمرارية).
 * لكنه يعتمد على وحدة native مُجمَّعة (9MB) قد لا تتوفر في بعض بيئات
 * الاستضافة. في هذه الحالة نرجع تلقائياً إلى `node:sqlite` المدمج في Node 22
 * حتى لا يتعطل النظام بالكامل — يفقد الاستمرارية السحابية لكنه يظل يعمل.
 *
 * هذا يعني أن أي مشكلة في الوحدة الأصلية لا تُسقط الموقع أبداً.
 */
let Database = null;
let driverName = 'unknown';
let driverError = null;

try {
  Database = require('libsql');
  driverName = 'libsql';
} catch (err) {
  driverError = err.message;
  try {
    const { DatabaseSync } = require('node:sqlite');
    Database = DatabaseSync;
    driverName = 'node:sqlite (fallback)';
  } catch (err2) {
    throw new Error(
      `تعذّر تحميل أي محرك قاعدة بيانات.\nlibsql: ${driverError}\nnode:sqlite: ${err2.message}`
    );
  }
}

if (driverError && process.env.PLUS_DEBUG_DB) {
  console.warn(`[db] libsql غير متاح، تم استخدام ${driverName}: ${driverError}`);
}

const USING_LIBSQL = driverName === 'libsql';

/** يزيل `_metadata` من صف واحد دون إفساد قيم مثل 0 أو false أو '' */
function cleanRow(row) {
  if (row === null || row === undefined || typeof row !== 'object') return row;
  if (!Object.prototype.hasOwnProperty.call(row, '_metadata')) return row;
  const { _metadata, ...rest } = row;
  return rest;
}

/** يزيل `_metadata` من نتيجة run() مع الحفاظ على changes / lastInsertRowid */
function cleanRunResult(result) {
  if (result === null || result === undefined || typeof result !== 'object') return result;
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

function wrapStatement(stmt) {
  return {
    run(...params) {
      return cleanRunResult(stmt.run(...params));
    },
    get(...params) {
      return cleanRow(stmt.get(...params));
    },
    all(...params) {
      const rows = stmt.all(...params);
      return Array.isArray(rows) ? rows.map(cleanRow) : rows;
    },
    iterate(...params) {
      return stmt.iterate(...params);
    },
    bind(...params) {
      stmt.bind(...params);
      return this;
    },
  };
}

/**
 * يفتح قاعدة البيانات.
 *
 * @param {object} options
 * @param {string}  options.path     مسار الملف المحلي (نسخة العمل)
 * @param {string=} options.syncUrl  رابط libsql:// لقاعدة Turso (اختياري).
 *                                   عند تمريره يعمل التطبيق بنمط embedded replica:
 *                                   يقرأ/يكتب محلياً فوراً ويزامن السحابة في الخلفية،
 *                                   فيبقى سريعاً ومستمراً حتى لو تعطل الاتصال.
 * @param {string=} options.authToken توكن Turso (DATABASE_AUTH_TOKEN)
 */
function createDatabase({ path, syncUrl, authToken }) {
  // لا يمكن استخدام Turso إلا مع محرك libSQL
  const isRemote = Boolean(syncUrl && authToken && USING_LIBSQL);

  const options = {};
  if (isRemote) {
    options.syncUrl = syncUrl;
    options.authToken = authToken;
  }


  // node:sqlite يقبل مساراً نصياً فقط، وlibSQL يقبل كائناً بالخيارات
  let raw;
  let remoteActive = isRemote;

  try {
    raw = USING_LIBSQL ? new Database(path, options) : new Database(path);
  } catch (err) {
    // لو فشل الاتصال بـ Turso (شبكة/توكن/انقطاع)، لا نُسقط الخادم بالكامل:
    // نفتح نسخة محلية ونكمل العمل. البيانات تبقى محفوظة على القرص،
    // وأي محاولة مزامنة لاحقة ستفشل بهدوء حتى تعود الخدمة.
    if (!isRemote) throw err;
    console.warn(`[db] تعذّر الاتصال بـ Turso: ${err.message}`);
    console.warn('[db] تم التحويل إلى الوضع المحلي مؤقتاً — البيانات على القرص فقط حتى تعود الخدمة.');
    raw = new Database(path);
    remoteActive = false;
  }

  return {
    exec(sql) {
      // libSQL لا يدعم WAL على النسخ المتزامنة، ويفشل بصمت عند المحاولة
      return raw.exec(sql);
    },
    prepare(sql) {
      return wrapStatement(raw.prepare(sql));
    },
    close() {
      try {
        raw.close();
      } catch {
        /* لا نُفشل الإغلاق */
      }
    },
    /**
     * يدفع التغييرات المحلية إلى Turso فوراً.
     * آمن تماماً في كل الأنماط: لو القاعدة محلية فقط أو غير متزامنة،
     * يرجع false بهدوء بدل ما يرمي استثناء ويكسر الطلب.
     */
    async sync() {
      if (!remoteActive) return false;
      try {
        await raw.sync();
        return true;
      } catch {
        // فشل المزامنة لا يجب أن يُسقط العملية: التغيير محفوظ محلياً
        // وسيُدفع في المزامنة التالية.
        return false;
      }
    },
    get raw() {
      return raw;
    },
    get isRemote() {
      return remoteActive;
    },
    get remoteConfigured() {
      return isRemote;
    },
  };
}

module.exports = { createDatabase, cleanRow, driverName, USING_LIBSQL };
