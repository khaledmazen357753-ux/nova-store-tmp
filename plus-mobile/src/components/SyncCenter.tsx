import React, { useEffect, useState } from 'react';
import {
  X,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  CloudOff,
  Smartphone,
  Server,
} from 'lucide-react';
import { getQueue, removeOperation, clearQueue, type QueuedOperation } from '../bridge/syncQueue';
import { getSyncState, onSyncState, runSync } from '../bridge/syncEngine';
import { getLastApiProbe, isForcedOffline, probeConnection, setForcedOffline } from '../bridge/network';
import { cacheSize, clearCache, getApiBaseUrl } from '../bridge/api';
import { PlusSpinner, PlusCrossEmblem } from './BrandIdentity';

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export const SyncCenter: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [queue, setQueue] = useState<QueuedOperation[]>(getQueue());
  const [sync, setSync] = useState(getSyncState());
  const [offlineMode, setOfflineMode] = useState(isForcedOffline());
  const [checking, setChecking] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQueue(getQueue());
    const unsub = onSyncState(setSync);
    return () => {
      unsub();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQueue(getQueue());
      setOfflineMode(isForcedOffline());
    }
  }, [open, sync.pending]);

  if (!open) return null;

  const probe = getLastApiProbe();

  const doRecheck = async () => {
    setChecking(true);
    const ok = await probeConnection(getApiBaseUrl());
    setChecking(false);
    setFlash(ok ? 'الاتصال بالخادم يعمل ✔' : 'تعذر الوصول للخادم — تحقق من الرابط أو الشبكة');
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#12110E] to-[#07070A] border-t sm:border border-[#D4AF37]/45 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_-10px_60px_rgba(0,0,0,.8)]">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#D4AF37]/20 shrink-0">
          <PlusCrossEmblem size={22} idPrefix="sync-hdr" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#FCE79C]">مركز المزامنة والتخزين</h3>
            <p className="text-[10.5px] text-[#9C9480]">العمل بدون إنترنت · المزامنة التلقائية</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-[#B8B09C]"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {flash && (
            <div className="text-[11px] px-3 py-2 rounded-lg bg-[#D4AF37]/12 border border-[#D4AF37]/35 text-[#FCE79C]">
              {flash}
            </div>
          )}

          {/* حالة الاتصال */}
          <section className="rounded-xl border border-[#D4AF37]/20 bg-[#0B0B10] p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#E9C662] font-bold">
              <Server className="w-3.5 h-3.5" /> حالة الاتصال بالخادم
            </div>
            <div className="text-[11px] text-[#A9A294] break-all leading-relaxed" dir="ltr">
              {getApiBaseUrl() || 'لم يتم ضبط رابط الخادم بعد'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8EE3B0]">
              <span className="truncate">
                {probe ? `آخر اتصال ناجح: ${timeAgo(probe.at)}` : 'لا يوجد اتصال ناجح مسجل'}
              </span>
              <button
                onClick={() => void doRecheck()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D4AF37]/40 text-[#FCE79C] font-bold hover:bg-[#D4AF37]/12 shrink-0"
              >
                {checking ? <PlusSpinner size={11} /> : <RefreshCw className="w-3 h-3" />}
                فحص
              </button>
            </div>

            <label className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 cursor-pointer">
              <span className="flex items-center gap-2 text-[11px] text-[#C8C0AA]">
                <CloudOff className="w-3.5 h-3.5 text-[#E08A3C]" />
                وضع عدم الاتصال اليدوي (لتجربة العمل أوفلاين)
              </span>
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={(e) => {
                  setOfflineMode(e.target.checked);
                  setForcedOffline(e.target.checked);
                }}
                className="w-4 h-4 accent-[#D4AF37]"
              />
            </label>
          </section>

          {/* إحصاءات */}
          <section className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#0B0B10] p-3 text-center">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37] mx-auto mb-1" />
              <div className="text-lg font-extrabold text-[#FCE79C] tabular-nums">{queue.length}</div>
              <div className="text-[10px] text-[#8E8778]">بانتظار المزامنة</div>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#0B0B10] p-3 text-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#40C178] mx-auto mb-1" />
              <div className="text-lg font-extrabold text-[#8EE3B0] tabular-nums">{sync.synced}</div>
              <div className="text-[10px] text-[#8E8778]">تمت مزامنتها</div>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/20 bg-[#0B0B10] p-3 text-center">
              <Database className="w-3.5 h-3.5 text-[#7FA8E3] mx-auto mb-1" />
              <div className="text-lg font-extrabold text-[#9FC0F0] tabular-nums">{cacheSize()}</div>
              <div className="text-[10px] text-[#8E8778]">شاشة محفوظة</div>
            </div>
          </section>

          {/* العمليات المعلّقة */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#E9C662] flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5" /> العمليات المحفوظة على الجهاز
              </h4>
              {queue.length > 0 && (
                <button
                  onClick={() => {
                    clearQueue();
                    setQueue([]);
                  }}
                  className="text-[10.5px] text-[#F09A9A] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> حذف الكل
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D4AF37]/25 p-6 text-center text-[11px] text-[#8E8778]">
                لا توجد عمليات معلّقة — كل شيء متزامن ✔
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((op) => (
                  <div
                    key={op.id}
                    className="rounded-xl border border-[#D4AF37]/18 bg-[#0B0B10] p-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/12 border border-[#D4AF37]/30 grid place-items-center shrink-0">
                      {op.attempts > 0 ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F09A9A]" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[#F3EAD2]">{op.label}</div>
                      <div className="text-[10px] text-[#8E8778] font-mono truncate" dir="ltr">
                        {op.method} {op.path}
                      </div>
                      <div className="text-[10px] text-[#756F62] mt-0.5">
                        {timeAgo(op.createdAt)}
                        {op.attempts > 0 && ` · محاولات: ${op.attempts}`}
                      </div>
                      {op.lastError && (
                        <div className="text-[10px] text-[#F0A8A8] mt-1 leading-relaxed">
                          {op.lastError}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        removeOperation(op.id);
                        setQueue(getQueue());
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-[#8E8778] shrink-0"
                      aria-label="حذف العملية"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex gap-2">
            <button
              onClick={() => void runSync()}
              disabled={sync.running || queue.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-[#E9C662] to-[#C59B27] text-[#17130A] font-extrabold text-xs disabled:opacity-40"
            >
              {sync.running ? <PlusSpinner size={14} /> : <RefreshCw className="w-3.5 h-3.5" />}
              مزامنة الآن
            </button>
            <button
              onClick={() => {
                clearCache();
                setFlash('تم مسح البيانات المؤقتة المحفوظة على الجهاز');
                setTimeout(() => setFlash(null), 3500);
              }}
              className="px-3 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#C8C0AA] text-xs hover:bg-white/5"
            >
              مسح الكاش
            </button>
          </section>

          {sync.lastError && (
            <div className="text-[10.5px] text-[#F0A8A8] text-center">{sync.lastError}</div>
          )}
        </div>
      </div>
    </div>
  );
};
