import React, { useState } from 'react';
import {
  Calculator,
  ShieldCheck,
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { PlusCrossEmblem, PlusSpinner, PlusWatermark } from './components/BrandIdentity';
import { getApiBaseUrl, setCustomApiBaseUrl } from './bridge/api';
import { probeConnection } from './bridge/network';

export const PortalPicker: React.FC<{
  online: boolean;
  onPick: (portal: 'erp' | 'admin') => void;
}> = ({ online, onPick }) => {
  const [showSetup, setShowSetup] = useState(false);
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

  const saveAndTest = async () => {
    const clean = url.trim().replace(/\/+$/, '');
    setCustomApiBaseUrl(clean);
    setTesting(true);
    setTestResult(null);
    const ok = await probeConnection(clean);
    setTesting(false);
    setTestResult({
      ok,
      msg: ok ? 'تم الاتصال بالخادم بنجاح ✔' : 'تعذر الوصول للخادم — تحقق من الرابط والشبكة',
    });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-[#050507] overflow-hidden">
      <PlusWatermark />

      <div className="relative z-10 flex-1 flex flex-col px-5 pt-10 pb-8 safe-bottom">
        <div className="flex items-center justify-between text-[10.5px] text-[#9C9480]">
          <span>نظم المعلومات المحاسبية</span>
          <span className={`flex items-center gap-1.5 ${online ? 'text-[#7BE3A6]' : 'text-[#E08A3C]'}`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'متصل' : 'أوفلاين'}
          </span>
        </div>

        <div className="flex flex-col items-center mt-8 mb-9">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-2xl" />
            <PlusCrossEmblem size={92} idPrefix="picker" className="relative" />
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <h1 className="text-2xl font-extrabold text-[#FAF6EA]">المحاسبي</h1>
            <span className="text-3xl font-bold font-royal gold-gradient-text">Plus</span>
          </div>
          <p className="text-[11.5px] text-[#A9A294] mt-2 text-center leading-relaxed max-w-[260px]">
            تطبيق الجوال الأصلي — يعمل بدون إنترنت ويزامن تلقائياً عند عودة الشبكة
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onPick('erp')}
            className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-[#D4AF37]/55 bg-gradient-to-l from-[#D4AF37]/18 to-transparent active:scale-[0.985] transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 grid place-items-center shrink-0">
              <Calculator className="w-6 h-6 text-[#FCE79C]" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-[14px] font-extrabold text-[#FAF6EA]">تطبيق المحاسبين</div>
              <div className="text-[10.5px] text-[#A9A294] mt-0.5">
                6 وحدات · 21 تقريراً · مخازن · رواتب
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-[#D4AF37] shrink-0" />
          </button>

          <button
            onClick={() => onPick('admin')}
            className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-[#D4AF37]/28 bg-[#0B0B10] active:scale-[0.985] transition"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/12 grid place-items-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#C8C0AA]" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-[14px] font-extrabold text-[#F3EAD2]">بوابة مدير النظام</div>
              <div className="text-[10.5px] text-[#9C9480] mt-0.5">
                الصلاحيات · الفترات المالية · النسخ الاحتياطي
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-[#8E8778] shrink-0" />
          </button>
        </div>

        <button
          onClick={() => setShowSetup((v) => !v)}
          className="mt-5 mx-auto flex items-center gap-1.5 text-[11px] text-[#8E8778] hover:text-[#D4AF37]"
        >
          <Settings2 className="w-3.5 h-3.5" />
          إعدادات الاتصال بالخادم
        </button>

        {showSetup && (
          <div className="mt-3 rounded-2xl border border-[#D4AF37]/25 bg-[#0B0B10] p-4 space-y-3">
            <label className="block text-[10.5px] text-[#9E9682]">
              رابط خادم البيانات (Backend API)
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              dir="ltr"
              placeholder="https://plus-erp-api.vercel.app"
              className="w-full px-3 py-2.5 rounded-xl bg-[#07070A] border border-[#D4AF37]/30 text-[12px] text-[#F3EAD2] outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => void saveAndTest()}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-[#E9C662] to-[#C59B27] text-[#17130A] font-extrabold text-[12px] disabled:opacity-50"
            >
              {testing ? <PlusSpinner size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
              حفظ واختبار الاتصال
            </button>
            {testResult && (
              <div
                className={`text-[10.5px] px-3 py-2 rounded-lg ${
                  testResult.ok
                    ? 'bg-[#40C178]/10 text-[#8EE3B0] border border-[#40C178]/30'
                    : 'bg-[#E08A3C]/10 text-[#FFC9A3] border border-[#E08A3C]/30'
                }`}
              >
                {testResult.msg}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-8 text-center text-[10px] text-[#6E695C] leading-relaxed">
          الإصدار {__APP_VERSION__} · المحاسبي Plus
          <br />
          يعمل بدون إنترنت · مزامنة تلقائية
        </div>
      </div>
    </div>
  );
};
