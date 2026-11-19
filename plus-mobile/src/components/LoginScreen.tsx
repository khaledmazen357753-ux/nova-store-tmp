import React, { useEffect, useState } from 'react';
import { Lock, User, ShieldCheck, Sparkles, LogIn } from 'lucide-react';
import { apiFetch, getApiBaseUrl, setCustomApiBaseUrl, setStoredToken } from '../bridge/api';
import { PlusCrossEmblem, PlusWatermark } from './BrandIdentity';

interface DemoAccount {
  username: string;
  full_name: string;
  role_code: string;
  role_name: string;
  description: string;
  demo_hint: string;
}

export const LoginScreen: React.FC<{
  onLoginSuccess: (payload: { user: any; company: any }) => void;
}> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('accountant');
  const [password, setPassword] = useState('plus123');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsApiUrl, setNeedsApiUrl] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());

  const checkAndLoadAccounts = () => {
    apiFetch('/api/auth/demo-accounts')
      .then((res) => {
        setDemoAccounts(res.accounts || []);
        setNeedsApiUrl(false);
        setError('');
      })
      .catch(() => {
        setNeedsApiUrl(true);
      });
  };

  useEffect(() => {
    checkAndLoadAccounts();
  }, []);

  const handleLogin = async (u = username, p = password) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u, password: p, portal: 'ERP' }),
      });
      setStoredToken(res.token);
      onLoginSuccess({ user: res.user, company: res.company });
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 md:p-8 bg-[#050507] overflow-hidden">
      <PlusWatermark />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* البطاقة اليمنى: الشعار الأصلي والهوية الملكية */}
        <div className="lg:col-span-5 royal-card royal-double-frame rounded-2xl p-8 flex flex-col items-center justify-between text-center bg-gradient-to-b from-[#12110E] via-[#09090C] to-[#050507]">
          <div className="w-full flex items-center justify-between text-xs text-[#B9AF95] border-b border-[#D4AF37]/20 pb-3">
            <span>نظم المعلومات المحاسبية</span>
            <span className="font-royal text-[#D4AF37]">PLUS ERP v1.0</span>
          </div>

          <div className="my-6 flex flex-col items-center">
            <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/70 shadow-[0_0_50px_rgba(212,175,55,0.3)] bg-black mb-5">
              <img
                src="/plus-logo.jpeg"
                alt="شعار المحاسبي Plus"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <h1 className="text-3xl font-extrabold text-[#FAF6EA]">المحاسبي</h1>
              <span className="text-4xl font-bold font-royal gold-gradient-text">Plus</span>
            </div>
            <p className="text-sm text-[#B8B09C] mt-2 leading-relaxed max-w-xs">
              منظومة تخطيط موارد المؤسسات المتكاملة (ERP) لإدارة الحسابات العامة، المبيعات، المشتريات، المخزون، والموارد البشرية في قاعدة بيانات موحدة دون ازدواج.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-[#D4AF37]/20 text-xs text-[#9C9480] flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>واجهة مستخدم مستقلة محمية بنظام صلاحيات متعدد المستويات</span>
          </div>
        </div>

        {/* البطاقة اليسرى: نموذج الدخول والحسابات السريعة */}
        <div className="lg:col-span-7 royal-card rounded-2xl p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold gold-gradient-text">تسجيل الدخول إلى المنظومة</h2>
                <p className="text-xs text-[#A8A08C] mt-1">أدخل بيانات الموظف أو اختر أحد الحسابات التجريبية الجاهزة بالأسفل للدخول الفوري</p>
              </div>
              {loading && (
                <PlusCrossEmblem size={42} idPrefix="login-spin" className="animate-plus-spin-fast" />
              )}
            </div>

            {needsApiUrl && (
              <div className="mb-4 p-4 rounded-xl bg-[#16130A] border border-[#D4AF37]/60 space-y-2.5">
                <div className="text-xs font-bold text-[#FCE79C]">ربط عنوان خادم البيانات المنشور (Plus Backend API URL)</div>
                <p className="text-[11px] text-[#B8AF9B]">
                  عند نشر الواجهة على دومين مستقل، الصق رابط خادم الـ Backend المنشور (أو اضبط المتغير <code className="text-[#E5C158]">VITE_API_BASE_URL</code> في إعدادات الاستضافة):
                </p>
                <div className="flex gap-2">
                  <input
                    dir="ltr"
                    placeholder="https://plus-erp-api.vercel.app"
                    value={apiUrlInput}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    className="flex-1 gold-input rounded-xl px-3 py-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomApiBaseUrl(apiUrlInput);
                      checkAndLoadAccounts();
                    }}
                    className="gold-metallic-btn px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    حفظ وربط
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#D9D1BE] mb-1.5">اسم المستخدم</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#D4AF37] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full gold-input rounded-xl py-2.5 pr-10 pl-4 text-sm"
                    placeholder="مثال: accountant أو admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D9D1BE] mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D4AF37] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full gold-input rounded-xl py-2.5 pr-10 pl-4 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full gold-metallic-btn rounded-xl py-3 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <PlusCrossEmblem size={22} idPrefix="btn-spin" className="animate-plus-spin-fast" />
                    <span>جارٍ التحقق وفتح قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>دخول إلى المحاسبي Plus</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* حسابات الدخول السريع حسب الصلاحيات الوظيفية */}
          <div className="mt-7 pt-5 border-t border-[#D4AF37]/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E5C86B] mb-3">
              <Sparkles className="w-4 h-4" />
              <span>دخول فوري بنقرة واحدة لتجربة نظام الصلاحيات (RBAC):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.demo_hint);
                    handleLogin(acc.username, acc.demo_hint);
                  }}
                  className="text-right p-2.5 rounded-xl bg-[#0C0C11] hover:bg-[#17161E] border border-[#D4AF37]/25 hover:border-[#D4AF37]/70 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5EFE0] group-hover:text-[#FCE79C]">
                      {acc.full_name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#E5C158] font-mono">
                      {acc.username}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9E9682] mt-0.5 truncate">{acc.role_name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
