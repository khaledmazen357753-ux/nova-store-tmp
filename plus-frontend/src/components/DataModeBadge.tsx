import React, { useEffect, useState } from 'react';
import { HardDriveDownload, Wifi, WifiOff } from 'lucide-react';
import { getDataMode } from '../lib/api';
import { offlineState } from '../offline/engine';

/**
 * مؤشر حالة البيانات في الشريط العلوي.
 *
 * يعرض للمستخدم بصدق أين تُحسب بياناته:
 *   • أوفلاين — المحرك يعمل على الجهاز (مع عدد الجداول والمسارات وحجم القاعدة)
 *   • سحابي  — البيانات على خادم خارجي
 * كما يعرض حالة الاتصال بالشبكة، لأنها لم تعد تؤثر على العمل في الوضع الأوفلاين.
 */
export const DataModeBadge: React.FC = () => {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [mode] = useState<'offline' | 'cloud'>(() => getDataMode());
  const [details, setDetails] = useState<{ tables: number; routes: number; kb: number } | null>(
    null
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'offline') return;
    let alive = true;
    const read = () => {
      const st = offlineState();
      if (!st || !alive) return;
      try {
        setDetails({
          tables: st.meta.tables,
          routes: st.meta.routes,
          kb: Math.round(st.db.size() / 1024),
        });
      } catch {
        /* تجاهل */
      }
    };
    // نقرأ الحجم مرة واحدة — export() تنسخ القاعدة كاملة فلا نكرّرها دورياً
    read();
    const timer = setTimeout(read, 1200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mode]);

  if (mode === 'cloud') {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101016] border border-[#D4AF37]/25 text-[11px]">
        {online ? (
          <Wifi className="w-3.5 h-3.5 text-[#D4AF37]" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className="font-bold text-[#DFD7C4]">وضع سحابي</span>
      </div>
    );
  }

  return (
    <div
      className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0E1512] border border-emerald-500/30 text-[11px]"
      title={
        details
          ? `محرك الحسابات يعمل داخل هذا الجهاز — ${details.tables} جدول، ${details.routes} مسار، ${details.kb} كيلوبايت`
          : 'محرك الحسابات يعمل داخل هذا الجهاز'
      }
    >
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
      <span className="font-bold text-emerald-300">أوفلاين</span>
      {details && (
        <span className="text-[#7E8B84] font-mono" dir="ltr">
          {details.tables}t · {details.kb}kb
        </span>
      )}
      {!online && (
        <span className="flex items-center gap-1 text-emerald-400/90 border-r border-emerald-500/25 pr-2 mr-0.5">
          <WifiOff className="w-3 h-3" />
          <span>بلا شبكة — يعمل</span>
        </span>
      )}
    </div>
  );
};
