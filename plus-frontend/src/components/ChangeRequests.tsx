import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  FileEdit,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch, fmtMoney } from '../lib/api';

/**
 * طلبات التعديل على البيانات الرئيسية — (ج) تعديلات بموافقة المدير
 * ═══════════════════════════════════════════════════════════════════════
 *
 * الشاشة لها وجهان بحسب من يفتحها، لأن الوظيفة نفسها تختلف:
 *
 *   مدير النظام → صندوق مراجعة: يقرأ الطلب، يرى قبل/بعد محسوباً على الحالة
 *                الحالية للبيانات، ثم يعتمد أو يرفض بسبب.
 *   غيره        → سجل طلباتي: يتابع ما أرسله، ويلغي ما لم يُراجَع بعد.
 *
 * ─ لماذا "قبل/بعد" يأتي من الخادم لا يُحسب هنا؟ ─────────────────────
 * لأن الخادم يحسبه على **نسخة مقرَّرة ثم يتراجع عنها** — أي أنه يحسب
 * النتيجة الفعلية للتعديل ثم يمحوها. لو حسبناها في الواجهة من بيانات
 * قديمة، لأظهرنا رقماً لا يطابق ما سيحدث. وهذا بالضبط الفرق الذي يجعل
 * الموافقة ذات معنى.
 */

interface ChangeRequestRow {
  change_id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string;
  requested_by_name: string;
  requested_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface ChangeDetail {
  field: string;
  from: unknown;
  to: unknown;
}

/** أسماء الكيانات بالعربية — الرسائل الإنجليزية في واجهة عربية تبدو كعطل */
const ENTITY_LABELS: Record<string, string> = {
  items: 'صنف',
  customers: 'عميل',
  suppliers: 'مورّد',
  employees: 'موظف',
  company_settings: 'بيانات المنشأة',
};

/** أسماء الحقول بالعربية — يُعرض بجانب القيمة ليفهم المدير ماذا يوافق عليه */
const FIELD_LABELS: Record<string, string> = {
  item_name: 'اسم الصنف',
  group_code: 'مجموعة الصنف',
  item_type: 'نوع الصنف',
  unit_of_measure: 'وحدة القياس',
  cost_price: 'سعر التكلفة',
  unit_price: 'سعر البيع',
  annual_demand: 'الطلب السنوي',
  safety_stock: 'مخزون الأمان',
  lead_time_days: 'مدة التوريد (يوم)',
  eoq: 'الكمية الاقتصادية',
  reorder_point: 'حد إعادة الطلب',
  customer_name: 'اسم العميل',
  address: 'العنوان',
  city: 'المدينة',
  phone: 'الهاتف',
  email: 'البريد',
  credit_limit: 'حد الائتمان',
  supplier_name: 'اسم المورّد',
  employee_name: 'اسم الموظف',
  job_title: 'المسمى الوظيفي',
  dept_code: 'القسم',
  specialization: 'التخصص',
  qualification: 'المؤهل',
  marital_status: 'الحالة الاجتماعية',
  basic_salary: 'الراتب الأساسي',
  housing_allowance: 'بدل السكن',
  transport_allowance: 'بدل النقل',
  meal_allowance: 'بدل الإعاشة',
  other_allowances: 'بدلات أخرى',
  company_name: 'اسم المنشأة',
  commercial_reg: 'السجل التجاري',
  tax_number: 'الرقم الضريبي',
  currency: 'العملة',
  fiscal_year: 'السنة المالية',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-950/40 border-amber-500/40 text-amber-300' },
  approved: { label: 'معتمد', cls: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' },
  rejected: { label: 'مرفوض', cls: 'bg-rose-950/40 border-rose-500/40 text-rose-300' },
  cancelled: { label: 'ملغى', cls: 'bg-[#13131A] border-[#D4AF37]/20 text-[#7E8B84]' },
};

/** الحقول المالية تُعرض بصيغة نقدية بدل رقم خام */
const MONEY_FIELDS = new Set([
  'cost_price',
  'unit_price',
  'credit_limit',
  'basic_salary',
  'housing_allowance',
  'transport_allowance',
  'meal_allowance',
  'other_allowances',
]);

function fmtField(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (MONEY_FIELDS.has(field)) return fmtMoney(Number(value));
  return String(value);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  // تواريخ SQLite تُرجع "YYYY-MM-DD HH:MM:SS" — نعرضها كما هي بلا تحويل
  // منطقة زمنية، لأن التحويل قد يحرّك اليوم فيبدو الطلب أقدم/أحدث خطأً.
  return String(iso).replace('T', ' ').slice(0, 16);
}

export const ChangeRequests: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [requests, setRequests] = useState<ChangeRequestRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // التفاصيل المفتوحة — طلب واحد في كل مرة، لأن المراجعة قرار فردي
  const [detail, setDetail] = useState<{
    id: string;
    changes: ChangeDetail[];
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    can_review: boolean;
    can_cancel: boolean;
    preview_error: string | null;
    request: ChangeRequestRow;
  } | null>(null);
  const [note, setNote] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  // رسالة تأكيد تختفي تلقائياً.
  //
  // ⚠ هذا الـHook كان موضوعاً **بعد** `if (!open) return null` في أول
  // إصدار، فكان React يرى عدد Hooks مختلفاً بين تصيير وآخر ويرمي:
  //   "Rendered more hooks than during the previous render"
  // وبلا Error Boundary كان الانهيار يمحو الشجرة كلها → شاشة سوداء عند كل
  // فتح. القاعدة: **كل hooks تُنادى قبل أي return مبكر**، بلا استثناء.
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await apiFetch<{
        requests: ChangeRequestRow[];
        pending_count: number;
        can_review: boolean;
      }>(`/api/change-requests${qs}`);
      setRequests(res.requests || []);
      setPendingCount(res.pending_count || 0);
      setCanReview(!!res.can_review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      // إعادة الضبط عند الإغلاق: لو تُرك الطلب مفتوحاً، فتح الشاشة لاحقاً
      // يعرض بيانات قديمة قد تكون اعتُمدت في الأثناء.
      setDetail(null);
      setNote('');
      setStatusFilter('pending');
    }
  }, [open]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!open) return null;

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setNote('');
    setError(null);
    try {
      const res = await apiFetch<{
        request: ChangeRequestRow;
        changes: ChangeDetail[];
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        can_review: boolean;
        can_cancel: boolean;
        preview_error: string | null;
      }>(`/api/change-requests/${id}`);
      setDetail({
        id,
        changes: res.changes || [],
        before: res.before || {},
        after: res.after || {},
        can_review: !!res.can_review,
        can_cancel: !!res.can_cancel,
        preview_error: res.preview_error || null,
        request: res.request,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل تفاصيل الطلب');
    } finally {
      setDetailLoading(false);
    }
  };

  const act = async (id: string, action: 'approve' | 'reject' | 'cancel') => {
    setBusy(`${action}:${id}`);
    setError(null);
    try {
      const body = action === 'cancel' ? {} : { note: note.trim() };
      const res = await apiFetch<{ message: string }>(`/api/change-requests/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setDetail(null);
      setNote('');
      // رسالة الخادم تحمل التفاصيل (ماذا تغيّر، السبب) — لا نصنع رسالة محلية
      setError(null);
      await load();
      // نعرض التأكيد في موضعه الطبيعي: أعلى القائمة
      setFlash(res.message || 'تم');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تنفيذ العملية');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0B0B10] border border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ── الترويسة ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <h2 className="text-sm font-extrabold gold-gradient-text">
                {canReview ? 'صندوق مراجعة التعديلات' : 'طلبات التعديل الخاصة بي'}
              </h2>
              <p className="text-[10px] text-[#7E8B84] mt-0.5">
                {canReview
                  ? 'تعديلات البيانات الرئيسية لا تُطبَّق قبل اعتمادك'
                  : 'لا تُطبَّق أي قيمة قبل موافقة مدير النظام'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingCount} معلّق
              </span>
            )}
            <button onClick={onClose} className="text-[#9E9682] hover:text-[#D4AF37] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── المرشّحات ── */}
        <div className="px-5 py-3 border-b border-[#D4AF37]/10 flex gap-1.5 shrink-0 overflow-x-auto">
          {(
            [
              ['pending', 'قيد المراجعة'],
              ['approved', 'معتمدة'],
              ['rejected', 'مرفوضة'],
              ['all', 'الكل'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === key
                  ? 'bg-[#D4AF37] text-[#0B0B10]'
                  : 'bg-[#13131A] text-[#9E9682] hover:text-[#E2DAC6] border border-[#D4AF37]/15'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="mr-auto px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#13131A] border border-[#D4AF37]/15 text-[#9E9682] hover:text-[#D4AF37] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {flash && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed text-emerald-200">{flash}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed text-rose-200">{error}</span>
            </div>
          )}

          {detailLoading && (
            <div className="p-8 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37] mx-auto" />
            </div>
          )}

          {/* ═══ التفاصيل ═══ */}
          {detail && !detailLoading && (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setDetail(null);
                  setNote('');
                }}
                className="text-[11px] text-[#9E9682] hover:text-[#D4AF37] cursor-pointer"
              >
                ← رجوع إلى القائمة
              </button>

              <div className="p-3.5 rounded-xl bg-[#0F0F16] border border-[#D4AF37]/25 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-extrabold text-[#FAF5E8]">
                      {detail.request.entity_label}
                    </div>
                    <div className="text-[10px] text-[#7E8B84] mt-0.5">
                      {ENTITY_LABELS[detail.request.entity_type] || detail.request.entity_type} ·{' '}
                      {detail.request.change_id}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      STATUS_META[detail.request.status]?.cls || ''
                    }`}
                  >
                    {STATUS_META[detail.request.status]?.label || detail.request.status}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#13131A] border border-[#D4AF37]/10">
                  <div className="text-[9px] text-[#7E8B84] mb-1">سبب التعديل</div>
                  <div className="text-[11px] leading-relaxed text-[#E2DAC6]">{detail.request.reason}</div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-[#7E8B84]">
                  <Clock className="w-3 h-3" />
                  <span>
                    طلب من {detail.request.requested_by_name} · {fmtDate(detail.request.requested_at)}
                  </span>
                </div>
              </div>

              {detail.preview_error && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed text-rose-200">
                    تعذّر حساب المعاينة: {detail.preview_error}
                  </span>
                </div>
              )}

              {/* ═══ قبل / بعد — محسوبان على الحالة الحالية للبيانات ═══ */}
              {detail.changes.length > 0 && (
                <div className="rounded-xl border border-[#D4AF37]/25 overflow-hidden">
                  <div className="px-3 py-2 bg-[#0F0F16] border-b border-[#D4AF37]/15 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#E5C158]">
                      ما سيتغيّر فعلياً ({detail.changes.length})
                    </span>
                    <span className="text-[9px] text-[#7E8B84]">محسوب على البيانات الحالية</span>
                  </div>
                  <div className="divide-y divide-[#D4AF37]/10">
                    {detail.changes.map((c) => (
                      <div key={c.field} className="px-3 py-2.5 flex items-center gap-2">
                        <span className="text-[10px] text-[#9E9682] w-24 shrink-0">
                          {FIELD_LABELS[c.field] || c.field}
                        </span>
                        <span className="text-[11px] text-rose-300/80 line-through tabular-nums">
                          {fmtField(c.field, c.from)}
                        </span>
                        <span className="text-[#7E8B84] text-[10px]">←</span>
                        <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                          {fmtField(c.field, c.to)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.changes.length === 0 && !detail.preview_error && (
                <div className="p-3 rounded-xl bg-[#13131A] border border-[#D4AF37]/15 text-[11px] text-[#7E8B84]">
                  لا فروق حالياً — القيم المطلوبة قد تكون طُبّقت بالفعل أو عُدّلت لتطابق الحالي.
                </div>
              )}

              {/* ═══ ملاحظة المراجعة (إلزامية عند الرفض) ═══ */}
              {detail.can_review && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#9E9682]">
                    ملاحظة المراجعة <span className="text-[#7E8B84]">(إلزامية عند الرفض)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="سبب الاعتماد أو سبب الرفض…"
                    className="w-full px-3 py-2 rounded-lg bg-[#13131A] border border-[#D4AF37]/25 text-[11px] text-[#FAF5E8] placeholder:text-[#5E6B64] focus:outline-none focus:border-[#D4AF37]/60 resize-none"
                  />
                </div>
              )}

              {/* ═══ الإجراءات ═══ */}
              <div className="flex gap-2">
                {detail.can_review && (
                  <>
                    <button
                      onClick={() => void act(detail.id, 'approve')}
                      disabled={busy !== null || detail.changes.length === 0}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B10] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {busy === `approve:${detail.id}` ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>اعتماد وتطبيق</span>
                    </button>
                    <button
                      onClick={() => void act(detail.id, 'reject')}
                      disabled={busy !== null || note.trim().length < 5}
                      title={note.trim().length < 5 ? 'اكتب سبب الرفض أولاً' : ''}
                      className="px-4 py-2 rounded-lg text-[11px] font-bold bg-[#13131A] hover:bg-[#1A1A24] border border-rose-500/40 text-rose-300 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>رفض</span>
                    </button>
                  </>
                )}
                {detail.can_cancel && (
                  <button
                    onClick={() => void act(detail.id, 'cancel')}
                    disabled={busy !== null}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer transition-colors disabled:opacity-40"
                  >
                    إلغاء الطلب
                  </button>
                )}
              </div>

              {detail.request.review_note && (
                <div className="p-2.5 rounded-lg bg-[#13131A] border border-[#D4AF37]/15">
                  <div className="text-[9px] text-[#7E8B84] mb-1">
                    ملاحظة {detail.request.reviewed_by_name || 'المراجع'} ·{' '}
                    {fmtDate(detail.request.reviewed_at)}
                  </div>
                  <div className="text-[11px] text-[#E2DAC6]">{detail.request.review_note}</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ القائمة ═══ */}
          {!detail && !detailLoading && (
            <>
              {loading && requests.length === 0 && (
                <div className="p-8 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37] mx-auto" />
                </div>
              )}

              {!loading && requests.length === 0 && (
                <div className="p-8 text-center space-y-1.5">
                  <FileEdit className="w-7 h-7 text-[#3A3A48] mx-auto" />
                  <div className="text-[11px] text-[#7E8B84]">
                    {statusFilter === 'pending' ? 'لا توجد طلبات بانتظار المراجعة' : 'لا توجد طلبات'}
                  </div>
                </div>
              )}

              {requests.map((r) => (
                <button
                  key={r.change_id}
                  onClick={() => void openDetail(r.change_id)}
                  className="w-full text-right p-3 rounded-xl bg-[#0F0F16] hover:bg-[#13131A] border border-[#D4AF37]/15 hover:border-[#D4AF37]/35 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#FAF5E8] truncate">{r.entity_label}</div>
                      <div className="text-[10px] text-[#7E8B84] mt-0.5 truncate">
                        {ENTITY_LABELS[r.entity_type] || r.entity_type} · {r.change_id} ·{' '}
                        {r.requested_by_name}
                      </div>
                      <div className="text-[10px] text-[#9E9682] mt-1 line-clamp-1">{r.reason}</div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        STATUS_META[r.status]?.cls || ''
                      }`}
                    >
                      {STATUS_META[r.status]?.label || r.status}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
