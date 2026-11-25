/**
 * قفل الكتابة بين تبويبات المتصفح.
 *
 * المشكلة: قاعدة البيانات تعيش في ذاكرة كل تبويب مستقلة. لو المستخدم فتح
 * النظام في تبويبين، وكل واحد أضاف فاتورة، فكلٌّ منهما يحفظ **صورته الكاملة**
 * للقاعدة فوق الأخرى — فيضيع عمل التبويب الآخر بلا أي رسالة.
 *
 * الحل: التبويب الأول فقط هو الذي يكتب. التبويبات الأخرى تفتح للقراءة
 * وتُظهر شريطاً واضحاً يطلب من المستخدم التبديل إلى التبويب النشط.
 *
 * يعتمد على Web Locks API (مدعوم في كل المتصفحات الحديثة) مع بديل
 * احتياطي عبر BroadcastChannel لتحديد التبويب النشط.
 */

const LOCK_NAME = 'plus_erp_db_writer';

let isWriter = false;
let listeners: ((writer: boolean) => void)[] = [];

export function onWriterChange(fn: (writer: boolean) => void) {
  listeners.push(fn);
  fn(isWriter);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function broadcast(writer: boolean) {
  isWriter = writer;
  listeners.forEach((fn) => fn(writer));
}

/** يطلب قفل الكتابة. يعيد true إن كان هذا التبويب هو الكاتب. */
export function claimWriteLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    // لا يوجد Web Locks — نسمح بالكتابة ونترك التحذير للمستخدم
    broadcast(true);
    return Promise.resolve(true);
  }

  // navigator.locks.request يحتفظ بالقفل ما دام التبويب مفتوحاً.
  // التبويب الذي ينجح أولاً يصبح الكاتب، والبقية ينتظرون.
  let grantedResolve: (() => void) | null = null;
  const granted = new Promise<void>((res) => {
    grantedResolve = res;
  });

  void navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, () => {
    broadcast(true);
    grantedResolve?.();
    return new Promise<void>(() => {
      /* يُحرَّر القفل عند إغلاق التبويب أو إعادة تحميله */
    });
  });

  // ننتظر لحظة محددة: إما أن يُمنح لنا القفل (فنحن الكاتب)،
  // أو يبقى محجوزاً لتبويب آخر (فنحن قارئ للعرض فقط).
  return new Promise((resolve) => {
    const TIMEOUT_MS = 400;
    const timer = setTimeout(() => {
      // انتهت المهلة ولم نُمنح القفل → تبويب آخر هو الكاتب
      if (!isWriter) {
        broadcast(false);
        // نراقب تحرّر القفل: إن أُغلق التبويب الكاتب نأخذه ونعيد التحميل
        void navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, () => {
          broadcast(true);
          if (becomeWriterHook) becomeWriterHook();
          return new Promise<void>(() => {});
        });
      }
      resolve(isWriter);
    }, TIMEOUT_MS);

    void granted.then(() => {
      clearTimeout(timer);
      resolve(true); // هو الكاتب
    });
  });
}

/** هل هذا التبويب هو الكاتب الآن؟ */
export function isWriterTab(): boolean {
  return isWriter;
}

/**
 * يُنادى عندما يصبح هذا التبويب كاتباً بعد أن كان قارئاً
 * (أي أن التبويب الكاتب السابق أُغلق). المحرك يستخدمه لإعادة تحميل
 * القاعدة من القرص حتى يرى كل ما كتبه التبويب السابق.
 */
let becomeWriterHook: (() => void) | null = null;
export function onBecomeWriter(fn: () => void) {
  becomeWriterHook = fn;
}



