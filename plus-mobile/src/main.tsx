import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * تسجيل الـ Service Worker في نسخة المتصفح فقط.
 *
 * داخل التطبيق الأصلي (Capacitor) لا نحتاجه: كل الأصول مضمَّنة داخل الـ APK أصلاً،
 * وتسجيل SW هناك قد يخزّن نسخة قديمة من الواجهة بعد التحديث.
 */
const cap = (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
const isNativeApp = Boolean(cap?.isNativePlatform?.());

if (!isNativeApp && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* الإضافة للشاشة الرئيسية تظل ممكنة حتى لو فشل التسجيل */
    });
  });
}
