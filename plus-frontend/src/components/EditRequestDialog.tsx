import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, FileEdit, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

/**
 * نموذج تقديم طلب تعديل على عنصر من البيانات الرئيسية.
 * ═══════════════════════════════════════════════════════════════════
 *
 * ─ لماذا نموذج بدل تحويل الصف إلى حقول قابلة للتحرير مباشرة؟ ────────
 * لأن الفكرة كلها هي أن **ما تراه ليس ما يمكنك تغييره**. لو جعلنا الجدول
 * قابلاً للتحرير، لكان حفظ التعديل فعلياً هو المسار الطبيعي، ويصبح الطلب
 * خطوة إضافية ينساها المستخدم. الفصل البصري يجعل نية "طلب" واضحة.
 *
 * ─ لماذا نُظهر القيم الحالية بجانب المدخلات؟ ──────────────────────
 * ليقرّر المستخدم ماذا يغيّر بالضبط بلا أن يفتح نافذة أخرى. والأهم: لا
 * يُرسل حقل لم يتغيّر — الخادم يرفض الطلب بلا تغيير، وتجربة "أرسلت طلباً
 * فقال لا يوجد تغيير" محبطة.
 */

export interface EditableField {
  key: string;
  label: string;
  type?: 'text' | 'number';
}

export const EditRequestDialog: React.FC<{
  open: boolean;
  entityType: string;
  entityId: string;
  entityLabel: string;
  /** الصف الحالي كاملاً — نستخرج منه القيم الحالية للحقول القابلة للتعديل */
  current: Record<string, unknown>;
  fields: EditableField[];
  onClose: () => void;
  onSubmitted: (message: string) => void;
}> = ({ open, entityType, entityId, entityLabel, current, fields, onClose, onSubmitted }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // نُهيّئ القيم من الصف الحالي عند كل فتح — لا عند أول تحميل فقط، وإلا
  // عُرضت قيم قديمة لو تغيّر الصف بين فتحتين.
  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const f of fields) {
      const v = current[f.key];
      init[f.key] = v === null || v === undefined ? '' : String(v);
    }
    setValues(init);
    setReason('');
    setError(null);
    setBusy(false);
  }, [open, entityId]);

  if (!open) return null;

  /** الحقول التي تغيّرت فعلاً — هي وحدها ما يُرسل */
  const changed = fields.filter((f) => {
    const before = current[f.key];
    const beforeStr = before === null || before === undefined ? '' : String(before).trim();
    return String(values[f.key] ?? '').trim() !== beforeStr;
  });

  const reasonOk = reason.trim().length >= 5;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of changed) payload[f.key] = values[f.key];

      const res = await apiFetch<{ message: string }>('/api/change-requests', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          payload,
          reason: reason.trim(),
        }),
      });
      onSubmitted(res.message || 'تم إرسال الطلب للمراجعة');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الطلب');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#0B0B10] border border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileEdit className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h2 className="text-sm font-extrabold gold-gradient-text">طلب تعديل</h2>
              <p className="text-[10px] text-[#7E8B84] mt-0.5 truncate max-w-[280px]">{entityLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9E9682] hover:text-[#D4AF37] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/30 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[10px] leading-relaxed text-amber-200">
              لن تُطبَّق أي قيمة الآن. يُرسل الطلب لمدير النظام ليراجعه ويعتمده.
            </span>
          </div>

          <div className="space-y-2">
            {fields.map((f) => {
              const before = current[f.key];
              const isChanged = changed.some((c) => c.key === f.key);
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-[#9E9682]">{f.label}</label>
                    <span className="text-[9px] text-[#5E6B64]">
                      الحالي: {before === null || before === undefined || before === '' ? '—' : String(before)}
                    </span>
                  </div>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    step="any"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg bg-[#13131A] border text-[11px] text-[#FAF5E8] focus:outline-none resize-none ${
                      isChanged
                        ? 'border-[#D4AF37]/60 focus:border-[#D4AF37]'
                        : 'border-[#D4AF37]/15 focus:border-[#D4AF37]/40'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#9E9682]">
              سبب التعديل <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="مثال: ارتفاع أسعار الموردين 12% هذا الشهر"
              className="w-full px-3 py-2 rounded-lg bg-[#13131A] border border-[#D4AF37]/25 text-[11px] text-[#FAF5E8] placeholder:text-[#5E6B64] focus:outline-none focus:border-[#D4AF37]/60 resize-none"
            />
            {reason.length > 0 && !reasonOk && (
              <p className="text-[9px] text-amber-400">اذكر سبباً أوضح (٥ أحرف على الأقل)</p>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-[10px] leading-relaxed text-rose-200">{error}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#D4AF37]/15 flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[#7E8B84]">
            {changed.length === 0 ? 'لم تغيّر أي حقل' : `${changed.length} حقل سيتغيّر`}
          </span>
          <div className="mr-auto flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-3 py-2 rounded-lg text-[11px] font-bold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer disabled:opacity-40"
            >
              إلغاء
            </button>
            <button
              onClick={() => void submit()}
              disabled={busy || changed.length === 0 || !reasonOk}
              className="px-4 py-2 rounded-lg text-[11px] font-bold bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B10] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              <span>إرسال للمراجعة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
