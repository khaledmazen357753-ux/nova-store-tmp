/**
 * تهيئة محرك موقع «المشتريات والمخازن والموردين».
 *
 * يبني على نفس `initOfflineEngine` المستخدم في النظام الكامل — نفس كود
 * الخادم، نفس المحرك المحاسبي، نفس قاعدة SQLite — لكن بمساحة عمل
 * معزولة: قاعدة IndexedDB خاصة، جلسة دخول خاصة، قفل كتابة خاص.
 *
 * ولماذا «خاصة» ضرورية: الموقعان على نفس الدومين، فبلا عزل يفتح موقع
 * المشتريات قاعدة النظام الكامل ويعدّل بياناتها. العزل هنا شرط سلامة
 * بيانات لا تحسيناً.
 *
 * ═══ لماذا على مرحلتين؟ ══════════════════════════════════════════════
 *
 * التهيئة تُنفَّذ قبل وجود أي مستخدم، فلا توكن ولا جلسة. والمستندات
 * (فواتير، أذون، سدادات) لا تُكتب بجمل SQL، بل تُنشأ عبر مسارات REST
 * التي تمرّ على auth — أي أنها تحتاج توكن.
 *
 *   المرحلة ١ (هنا، أثناء التهيئة): البيانات الرئيسية — بلا طلبات REST.
 *   المرحلة ٢ (بعد الدخول، من الواجهة): المستندات — بالتوكن الحقيقي.
 *
 * لو أُجبرت المرحلتان على مكان واحد لصار انتظاراً دائرياً: التهيئة تنتظر
 * الدخول، والدخول ينتظر التهيئة.
 */

import { initOfflineEngine, offlineState, canWrite, registerEngineConfig, type EngineConfig } from '../offline/engine';
import type { OfflineDb } from '../offline/db';
import { dispatch } from '../offline/bridge';
import { SERVER_BUNDLE } from '../generated/engineBundle';
import { seedProcurementMaster, createProcurementDocuments } from './data';
import { todayIso } from '../lib/api';

export const PROCUREMENT_NAMESPACE = 'procurement';
export const PROCUREMENT_PREFIX = '/procurement';

/** هل اكتملت المرحلة الثانية لهذه الجلسة؟ (للتشخيص فقط) */
let documentsReady = false;
export function procurementDocumentsReady() {
  return documentsReady;
}

function serverAuth(): Record<string, (...args: unknown[]) => unknown> {
  const moduleObj: { exports: Record<string, any> } = { exports: {} };
  const factory = new Function('module', 'exports', SERVER_BUNDLE);
  factory(moduleObj, moduleObj.exports);
  if (typeof moduleObj.exports.auth?.hashPassword !== 'function') {
    throw new Error('دالة تجزئة كلمات المرور غير موجودة في حزمة الخادم');
  }
  return moduleObj.exports.auth as Record<string, (...args: unknown[]) => unknown>;
}

/**
 * يبني دالة الزراعة التي تُنفَّذ من داخل `createOfflineDb` **بعد** تنفيذ
 * المخطط وقبل أي حفظ — أي على قاعدة جديدة تماماً.
 */
function makeSeedFunction() {
  // ⚠️ لا نستدعي serverAuth() هنا: بناء CONFIG يحدث وقت تحميل الوحدة،
  // قبل حقن بدائل التشفير والـ Express في المحرك. الاستدعاء المتأخر هو
  // الفرق بين «دوال التشفير لم تُحقن بعد» وبين نظام يعمل.
  return (db: OfflineDb) => {
    const hashPassword = serverAuth().hashPassword as (p: string) => string;
    // `createOfflineDb` تنتظر قيمة الإرجاع، فدالة async هنا مقبولة.
    // المشكلة الوحيدة: لا نملك `routers` بعد. لذلك لا تلمس هذه المرحلة
    // أي مسار — وهي أصلاً لا تحتاج: البيانات الرئيسية صفوف لا مستندات.
    const state = {
      db: db as unknown as OfflineDb & { persist(): Promise<void> },
      routers: [],
    };
    return seedProcurementMaster(state as never, { dispatch, hashPassword }).then(() => undefined);
  };
}

const CONFIG: EngineConfig = {
  namespace: PROCUREMENT_NAMESPACE,
  apiPrefix: PROCUREMENT_PREFIX,
  label: 'procurement',
  // لا نستخدم زراعة الخادم الكاملة: مبيعات ورواتب وعملاء لا تخص هذا الموقع.
  seed: makeSeedFunction(),
  // وحدة إدارة المستخدمين والنسخ الاحتياطي الكامل تُخفى: تعرض كل بيانات
  // الشركة، ولا يحتاجها مستخدم المشتريات.
  mount: { master: true, transactions: true, reports: true, admin: false, changeRequests: true },
};

// يُسجَّل فور تحميل الوحدة: أي طلب بيانات قبل التهيئة يستخدم إعدادات
// المشتريات لا إعدادات النظام الكامل.
registerEngineConfig(CONFIG);

/** يهيّئ محرك موقع المشتريات (المرحلة ١). آمن للاستدعاء مراراً. */
export async function initProcurementEngine() {
  return initOfflineEngine(CONFIG);
}

/**
 * المرحلة الثانية — تُستدعى بعد نجاح تسجيل الدخول.
 *
 * آمنة للتكرار: لا تضيف شيئاً لو كانت المستندات موجودة.
 */
export async function ensureProcurementDocuments(token: string) {
  const state = offlineState();
  if (!state || !canWrite()) return { created: 0, skipped: true };

  // التاريخ الفعلي لا يُستخدم في البيانات، لكن نتحقق أن المستندات لم
  // تُنشأ على قاعدة مستخدم حقيقي فيها مستنداته: عندها نتوقف فوراً.
  const result = await createProcurementDocuments(
    { db: state.db, routers: state.routers },
    { dispatch },
    token
  );
  documentsReady = !result.skipped;
  return result;
}

/** تاريخ اليوم بصيغة ISO — يُستخدم في شاشة إصدار المستندات اليدوية */
export { todayIso };
