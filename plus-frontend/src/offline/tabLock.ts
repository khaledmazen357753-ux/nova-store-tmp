
/**
 * رمز الجهاز — معرّف قصير وفريد لهذا المتصفح.
 *
 * الغرض: منع تضارب أرقام المستندات بين الأجهزة الأوفلاين. كل جهاز يولّد
 * رمزاً من 4 أحرف مرة واحدة ويحفظه، فتصبح أرقامه SINV-A7K2-1001 بدل
 * SINV-1001 المشتركة بين الجميع.
 *
 * لا يُستخدم إطلاقاً في الوضع السحابي، فشكل الأرقام هناك يبقى كما هو.
 */
const DEVICE_TAG_KEY = 'plus_erp_device_tag';
const TAG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بلا حروف متشابهة

export function getDeviceTag(): string {
  let tag = localStorage.getItem(DEVICE_TAG_KEY);
  if (tag && /^[A-Z0-9]{4}$/.test(tag)) return tag;

  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  tag = Array.from(bytes)
    .map((b) => TAG_ALPHABET[b % TAG_ALPHABET.length])
    .join('');
  localStorage.setItem(DEVICE_TAG_KEY, tag);
  return tag;
}

/* ═══════════════════════════════════════════════════════════════════
 * قفل الكتابة بين تبويبات المتصفح
 * ═══════════════════════════════════════════════════════════════════
 *
 * المشكلة: قاعدة البيانات تعيش في ذاكرة كل تبويب مستقلة. لو فتح المستخدم
 * النظام في تبويبين وأضاف كلٌّ منهما فاتورة، فكلٌّ يحفظ **صورته الكاملة**
 * للقاعدة فوق الأخرى — فيضيع عمل التبويب الآخر بلا أي رسالة.
 *
 * الحل: التبويب الأول فقط يحصل على قفل الكتابة. البقية تفتح للعرض فقط
 * وتُظهر شريطاً صريحاً، وأي محاولة حفظ منها تُرفض قبل الوصول للمحرك.
 *
 * يعتمد على Web Locks API (مدعوم في كل المتصفحات الحديثة). إن غاب،
 * نسمح بالكتابة بدل تعطيل النظام كله.
 */

const WRITE_LOCK = 'plus_erp_db_writer';

let writerTab = false;
let writerListeners: ((writer: boolean) => void)[] = [];
let becomeWriterHook: (() => void) | null = null;

/** يُبلّغ كل المستمعين بتغيّر حالة الكتابة */
function setWriterState(next: boolean) {
  if (writerTab === next) return;
  writerTab = next;
  writerListeners.forEach((fn) => fn(next));
}

/** يستمع لتغيّر حالة الكتابة. يعيد دالة لإلغاء الاشتراك. */
export function onWriterChange(fn: (writer: boolean) => void) {
  writerListeners.push(fn);
  fn(writerTab);
  return () => {
    writerListeners = writerListeners.filter((l) => l !== fn);
  };
}

/**
 * يُنادى عندما يصبح هذا التبويب كاتباً بعد أن كان قارئاً (أي أُغلق الكاتب
 * السابق). المحرك يستخدمه لإعادة تحميل الصفحة حتى يقرأ كل ما كُتب.
 */
export function onBecomeWriter(fn: () => void) {
  becomeWriterHook = fn;
}

/** هل هذا التبويب هو الكاتب الآن؟ */
export function isWriterTab(): boolean {
  return writerTab;
}

/**
 * يطلب قفل الكتابة. يعيد true إن كان هذا التبويب هو الكاتب.
 *
 * ملاحظة على التوقيت: منح القفل يحدث داخل رد نداء غير متزامن، لذلك لا
 * يكفي فحص المتغيّر مباشرة بعد الطلب. ننتظر إما المنح الفعلي أو مهلة
 * قصيرة، فأي فحص مبكر كان يرجع حالة قديمة خاطئة.
 */
export function claimWriteLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    // لا يوجد Web Locks — نسمح بالكتابة ونترك التحذير للمستخدم
    setWriterState(true);
    return Promise.resolve(true);
  }

  let grantResolve: (() => void) | null = null;
  const granted = new Promise<void>((res) => {
    grantResolve = res;
  });

  // نحتفظ بالقفل ما دام التبويب مفتوحاً (لا نُعيد الوعد أبداً)
  void navigator.locks.request(WRITE_LOCK, { mode: 'exclusive' }, () => {
    setWriterState(true);
    grantResolve?.();
    return new Promise<void>(() => {
      /* يُحرَّر القفل عند إغلاق التبويب أو إعادة تحميله فقط */
    });
  });

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // انتهت المهلة ولم نُمنح القفل → تبويب آخر هو الكاتب
      setWriterState(false);

      // نراقب تحرّر القفل: إن أُغلق التبويب الكاتب نأخذه ونعيد التحميل
      void navigator.locks.request(WRITE_LOCK, { mode: 'exclusive' }, () => {
        setWriterState(true);
        if (becomeWriterHook) becomeWriterHook();
        return new Promise<void>(() => {});
      });

      resolve(false);
    }, 400);

    void granted.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}
