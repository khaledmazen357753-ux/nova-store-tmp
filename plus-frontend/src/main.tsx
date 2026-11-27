import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initOfflineEngine } from './offline/engine';
import { resetSqlJsCache } from './offline/db';
import { getDataMode } from './lib/api';
import './index.css';

/**
 * شاشة الافتتاح الأولى — تُرسم قبل تحميل React، فالأسلوب مضمّن هنا
 * عمداً حتى تظهر فوراً بلا انتظار أي ملف CSS.
 */
const BOOT_HTML = `
<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#060608;font-family:system-ui,-apple-system,sans-serif;direction:rtl">
  <div style="text-align:center">
    <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:50%;border:2px solid rgba(212,175,55,.25);border-top-color:#D4AF37;animation:plusBootSpin .8s linear infinite"></div>
    <div style="color:#D4AF37;font-size:14px;font-weight:700;letter-spacing:.02em">المحاسبي Plus</div>
    <div style="color:#7C7565;font-size:11px;margin-top:6px">جارٍ تشغيل محرك الحسابات المحلي…</div>
  </div>
  <style>@keyframes plusBootSpin{to{transform:rotate(360deg)}}</style>
</div>`;

/**
 * شاشة فشل صريحة عند تعذر تشغيل محرك الحسابات المحلي.
 *
 * الغرض: المستخدم يجب ألا يرى شاشة دخول لا تعمل بلا سبب. معالجة الكاش
 * التالف يدوياً غير بديهية، فنعرضها خطوة بخطوة بدل انتظار تخمينه.
 */
function renderBootFailure(err: unknown) {
  const root = document.getElementById('root')!;
  const message = err instanceof Error ? err.message : String(err);
  const isWasm = /wasm|webassembly|fetch/i.test(message);
  const safe = message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string);

  const hint = isWasm
    ? 'ملف قاعدة البيانات (WebAssembly) لم يُحمَّل. السبب الأشهر أن نسخة قديمة تالفة منه محفوطة في ذاكرة المتصفح.'
    : 'حدث خطأ أثناء تهيئة قاعدة البيانات المحلية.';

  root.innerHTML = `
    <div dir="rtl" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0B10;padding:24px;font-family:system-ui,Tahoma,sans-serif">
      <div style="max-width:560px;background:#13131A;border:1px solid rgba(212,175,55,.3);border-radius:16px;padding:24px">
        <div style="font-size:16px;font-weight:800;color:#D4AF37;margin-bottom:10px">تعذر تشغيل محرك الحسابات</div>
        <div style="font-size:13px;color:#C9C1AC;line-height:1.9;margin-bottom:16px">${hint}</div>
        <div style="font-size:12px;color:#8F9BB3;line-height:2;margin-bottom:16px">
          <b style="color:#E2DAC6">الحل:</b><br>
          ١) اضغط «مسح الكاش وإعادة المحاولة» بالأسفل.<br>
          ٢) إن لم ينفع، أعد تحميل الصفحة بـ Ctrl+Shift+R.<br>
          ٣) بياناتك المحفوظة لن تُمس — المسح يخصّ ملفات التطبيق فقط.
        </div>
        <button id="plus-recover" style="width:100%;background:#D4AF37;color:#0B0B10;border:0;border-radius:10px;padding:12px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;margin-bottom:10px">
          مسح الكاش وإعادة المحاولة
        </button>
        <div style="font-size:11px;color:#5E6B7E;font-family:monospace;direction:ltr;text-align:left;word-break:break-all">${safe}</div>
      </div>
    </div>`;

  document.getElementById('plus-recover')?.addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('تعذر مسح الكاش:', e);
    }
    // لا نمسح IndexedDB — فيه بيانات المستخدم الفعلية.
    // نُفرغ نواة wasm المخزَّنة كي يُعاد تحميلها فعلاً بدل إعادة استخدام
    // النسخة الفاشلة من الذاكرة، وإلا بدا الزر كأنه لا يفعل شيئاً.
    resetSqlJsCache();
    window.location.reload();
  });
}

/**
 * تشغيل النظام.
 *
 * في الوضع الأوفلاين (الافتراضي) نهيّئ قاعدة البيانات المحلية ومحرك
 * الحسابات **قبل** رسم أي شاشة، حتى لا يرى المستخدم أي شاشة نصف جاهزة.
 * في الوضع السحابي نتجاوز التهيئة المحلية تماماً.
 */
async function boot() {
  const root = document.getElementById('root')!;

  if (getDataMode() === 'offline') {
    // شاشة افتتاحية بسيطة أثناء تحميل محرك الحسابات (أول فتحة فقط ~200ms)
    root.innerHTML = BOOT_HTML;
    try {
      await initOfflineEngine();
    } catch (err) {
      // لا نكمل كأن شيئاً لم يكن. سابقاً كان الخطأ يُطبع في الـ console فقط
      // فيظهر المستخدم أمام شاشة دخول لا تعمل، بلا سبب مفهوم. الأفضل أن
      // يرى الخطأ صراحةً مع إجراء واضح يعالجه.
      console.error('تعذر تشغيل قاعدة البيانات المحلية:', err);
      renderBootFailure(err);
      return;
    }
  }

  root.innerHTML = '';
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/** تسجيل Service Worker — يجعل التطبيق يُفتح بدون إنترنت */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) return; // في التطوير لا نريد تدخلاً من الكاش

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('تعذر تسجيل عامل الخدمة:', err);
    });
  });
}

registerServiceWorker();
void boot();
