import React, { useEffect, useState } from 'react';
import { Truck, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiFetch, setStoredToken } from '../lib/api';
import { ensureProcurementDocuments } from './engine';

/**
 * شاشة دخول موقع المشتريات.
 *
 * لماذا شاشة خاصة وليست شاشة النظام الكامل؟
 *   لأن الحساب هنا قد لا يكون موجوداً هناك والعكس. الجلسة معزولة تماماً:
 *   التوكن يُحفظ في مفتاح منفصل، وقاعدة المستخدمين قاعدة أخرى.
 *
 * ولماذا تُعرض قائمة الحسابات التجريبية؟
 *   لأن هذه بيئة عرض: من يفتح الموقع يجب أن يعرف كيف يدخل، وأي حساب
 *   يرى ماذا (مسؤول مشتريات لا يستطيع اعتماد طلب تعديل — وهذا مقصود).
 */

interface DemoAccount {
  username: string;
  full_name: string;
  role_name: string;
  description?: string;
  demo_hint?: string;
}

export const ProcurementLogin: React.FC<{ onSuccess: (session: any) => void }> = ({ onSuccess }) => {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/auth/demo-accounts')
      .then((res) => setAccounts(res.accounts || []))
      .catch(() => setAccounts([]));
  }, []);

  const login = async (u = username, p = password) => {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u, password: p, portal: 'ERP' }),
      });
      setStoredToken(res.token);
      // المرحلة الثانية: إنشاء مستندات التشغيل — مرة واحدة، وبالتوكن
      // الحقيقي. أي فشل هنا يظهر صراحة ولا يُبتلع: بيانات نصف مكتملة
      // تبدو صحيحة وهي ليست كذلك.
      try {
        await ensureProcurementDocuments(res.token);
      } catch (seedErr: any) {
        setError(`تم الدخول، لكن تعذّر تجهيز مستندات التشغيل: ${seedErr.message}`);
      }
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'تعذّر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-5">
        {/* اللوحة التعريفية */}
        <div className="royal-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F3D77D] to-[#A57D1E] flex items-center justify-center">
                <Truck className="w-6 h-6 text-[#09090B]" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold gold-gradient-text">المشتريات والمخازن</h1>
                <p className="text-[10px] text-[#8C8474] tracking-wide">PLUS PROCUREMENT SUITE</p>
              </div>
            </div>

            <p className="text-xs text-[#C7BFA9] mt-5 leading-relaxed">
              موقع مستقل لإدارة دورة التوريد كاملة: أوامر التوريد، فواتير الشراء، مردودات المشتريات،
              سدادات الموردين، وأذون الإضافة والصرف — مع بطاقة لكل صنف وكشف حساب لكل مورد.
            </p>

            <ul className="mt-4 space-y-2 text-[11px] text-[#A9A292]">
              {[
                'كل مستند يُنشئ قيد يومية متوازناً تلقائياً',
                'أرصدة الموردين والمخزون تُحدَّث لحظياً',
                'لا تغيير في بيانات رئيسية بلا اعتماد المدير',
                'يعمل بلا إنترنت — البيانات محفوظة على جهازك',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="text-[#D4AF37] mt-0.5">◆</span>
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 text-[10px] text-[#6F6A5D] leading-relaxed border-t border-[#D4AF37]/15 pt-3">
            قاعدة بيانات هذا الموقع مستقلة تماماً عن النظام المحاسبي الكامل — تسجيل الدخول هنا لا
            يفتح النظام الكامل، والعكس صحيح.
          </div>
        </div>

        {/* النموذج */}
        <div className="royal-card royal-double-frame rounded-2xl p-6">
          <h2 className="text-sm font-bold text-[#FAF5E8]">تسجيل الدخول</h2>
          <p className="text-[10px] text-[#8C8474] mt-1">استخدم أحد الحسابات أدناه</p>

          <form
            className="space-y-3 mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
          >
            <label className="block">
              <span className="text-[11px] text-[#C7BFA9]">اسم المستخدم</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                autoComplete="username"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-[#C7BFA9]">كلمة المرور</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                autoComplete="current-password"
                dir="ltr"
              />
            </label>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-[11px] flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full gold-metallic-btn rounded-xl py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {busy ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#09090B]/30 border-t-[#09090B] animate-plus-spin-fast" />
                  جارٍ الدخول…
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> دخول
                </>
              )}
            </button>
          </form>

          {accounts.length > 0 && (
            <div className="mt-5 border-t border-[#D4AF37]/15 pt-4">
              <div className="text-[10px] text-[#8C8474] mb-2">حسابات العرض — اضغط للدخول مباشرة</div>
              <div className="space-y-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.username}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setUsername(a.username);
                      setPassword(a.demo_hint || 'plus123');
                      login(a.username, a.demo_hint || 'plus123');
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl bg-[#0F0F14] border border-[#D4AF37]/18 hover:border-[#D4AF37]/45 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#F7F3E8] font-bold">{a.full_name}</span>
                      <ArrowLeft className="w-3 h-3 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="text-[10px] text-[#8C8474] mt-0.5">
                      {a.role_name} · <span dir="ltr">{a.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* طريق العودة — زائر وصل هنا بالخطأ يجب ألا يعلق */}
          <a
            href="/"
            className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#8C8474] hover:text-[#E5C158] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> العودة إلى النظام المحاسبي الكامل
          </a>
        </div>
      </div>
    </div>
  );
};
