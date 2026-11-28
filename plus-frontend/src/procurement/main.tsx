import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProcurementApp } from './App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initProcurementEngine } from './engine';
import { configureApi } from '../lib/api';
import { PROCUREMENT_NAMESPACE } from './engine';
import '../index.css';

/**
 * نقطة دخول موقع «المشتريات والمخازن والموردين».
 *
 * الفرق عن نقطة دخول النظام الكامل سطران فقط: تهيئة مساحة عمل معزولة،
 * وفصل مفاتيح الجلسة. هذا مقصود — كل المنطق المحاسبي واحد.
 */
configureApi({ namespace: PROCUREMENT_NAMESPACE });

const root = ReactDOM.createRoot(document.getElementById('root')!);

/**
 * نفس مبدأ النظام الكامل: الخطأ يُعرض، لا يُحوَّل إلى شاشة سوداء.
 * أي انهيار في أي مكوّن يظهر برسالة وزر إعادة تحميل، والبيانات تبقى
 * على الجهاز — لأن المشكلة في العرض لا في قاعدة البيانات.
 */
function renderFailure(err: unknown) {
  // نُسجّل التفاصيل في الطرفية أيضاً: الشاشة للمستخدم، والمكدّس لمن يدعمه.
  // بلا هذا السطر يصبح تشخيص عطل إنتاج تخميناً من نص واحد.
  console.error('[Plus Procurement] فشل تهيئة المحرك:', err);
  const message = err instanceof Error ? err.message : String(err);
  const safe = message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string);
  document.getElementById('root')!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#060608;color:#F7F3E8;font-family:system-ui,sans-serif;direction:rtl;padding:24px">
      <div style="max-width:520px;text-align:center">
        <div style="color:#D4AF37;font-size:15px;font-weight:800;margin-bottom:10px">تعذّر تشغيل موقع المشتريات</div>
        <div style="color:#A9A292;font-size:12px;line-height:1.9;margin-bottom:16px">${safe}</div>
        <div style="color:#6F6A5D;font-size:11px;line-height:1.9;margin-bottom:20px">
          بياناتك لم تُمس — الخطأ في تشغيل الصفحة لا في قاعدة البيانات المحفوظة على جهازك.
        </div>
        <button onclick="location.reload()" style="background:linear-gradient(135deg,#F3D77D,#A57D1E);color:#09090B;border:0;padding:10px 22px;border-radius:12px;font-weight:800;font-size:12px;cursor:pointer">
          إعادة التحميل
        </button>
      </div>
    </div>`;
}

initProcurementEngine()
  .then(() => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary area="موقع المشتريات">
          <ProcurementApp />
        </ErrorBoundary>
      </React.StrictMode>
    );
  })
  .catch(renderFailure);
