import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initOfflineEngine } from './offline/engine';
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
      // نعرض الشاشة على أي حال — ستعطي رسالة واضحة عند أول طلب
      console.error('تعذر تشغيل قاعدة البيانات المحلية:', err);
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
