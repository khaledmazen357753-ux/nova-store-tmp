import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Wifi } from 'lucide-react';
import { getSyncState, onSyncState, runSync, type SyncState } from '../bridge/syncEngine';
import { isOnline, onNetworkChange, probeConnection } from '../bridge/network';
import { getApiBaseUrl } from '../bridge/api';
import { PlusSpinner } from './BrandIdentity';

export const NetworkBanner: React.FC<{ onOpenSync?: () => void }> = ({ onOpenSync }) => {
  const [online, setOnline] = useState(isOnline());
  const [sync, setSync] = useState<SyncState>(getSyncState());
  const [checking, setChecking] = useState(false);

  useEffect(() => onNetworkChange(setOnline), []);
  useEffect(() => onSyncState(setSync), []);

  const recheck = async () => {
    setChecking(true);
    await probeConnection(getApiBaseUrl());
    setChecking(false);
  };

  const busy = sync.running;
  const hasPending = sync.pending > 0;

  if (online && !hasPending) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-[#7BE3A6] bg-[#0A1A12] border-b border-[#40C178]/25 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#40C178] shadow-[0_0_8px_#40C178]" />
        <Wifi className="w-3 h-3" />
        <span>متصل بالخادم — كل البيانات محدّثة</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-[11px] border-b shrink-0 ${
        online
          ? 'text-[#FCE79C] bg-[#1A1608] border-[#D4AF37]/30'
          : 'text-[#FFC9A3] bg-[#1E1206] border-[#E08A3C]/35'
      }`}
    >
      {busy ? (
        <PlusSpinner size={14} />
      ) : online ? (
        <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
      ) : (
        <CloudOff className="w-3.5 h-3.5 text-[#E08A3C]" />
      )}

      <span className="flex-1 truncate">
        {busy
          ? `جارٍ مزامنة ${sync.pending} عملية…`
          : online
          ? `يوجد ${sync.pending} عملية بانتظار المزامنة`
          : `وضع عدم الاتصال — ${sync.pending > 0 ? `${sync.pending} عملية محفوظة على الجهاز` : 'تُعرض آخر بيانات محفوظة'}`}
      </span>

      {online && hasPending && !busy && (
        <button
          onClick={() => void runSync()}
          className="px-2.5 py-1 rounded-lg border border-[#D4AF37]/45 text-[#FCE79C] font-bold hover:bg-[#D4AF37]/15"
        >
          مزامنة الآن
        </button>
      )}

      {!online && (
        <button
          onClick={() => void recheck()}
          className="px-2.5 py-1 rounded-lg border border-[#E08A3C]/45 text-[#FFC9A3] font-bold hover:bg-[#E08A3C]/15 flex items-center gap-1"
        >
          {checking ? <PlusSpinner size={11} /> : <RefreshCw className="w-3 h-3" />}
          إعادة المحاولة
        </button>
      )}

      {onOpenSync && (
        <button
          onClick={onOpenSync}
          className="px-2.5 py-1 rounded-lg border border-white/15 text-[#C8C0AA] hover:bg-white/5"
        >
          التفاصيل
        </button>
      )}

      {sync.failed > 0 && (
        <span className="flex items-center gap-1 text-[#F09A9A]">
          <AlertTriangle className="w-3 h-3" /> {sync.failed} مرفوضة
        </span>
      )}
      {sync.synced > 0 && !busy && (
        <span className="flex items-center gap-1 text-[#7BE3A6]">
          <CheckCircle2 className="w-3 h-3" /> {sync.synced}
        </span>
      )}
    </div>
  );
};
