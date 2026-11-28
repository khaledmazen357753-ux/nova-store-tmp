import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { apiFetch, exportToCsv } from '../../lib/api';
import { Card, Money, Num, Badge, Table, Spinner, Notice, Button, Select, TotalRow } from './ui';

/**
 * تقارير المشتريات والمخازن.
 *
 * كل تقرير هنا هو نفس المسار الذي يستخدمه النظام المحاسبي الكامل:
 *   /api/reports/purchases?type=...
 *   /api/reports/inventory?type=...
 *   /api/reports/financial?type=...
 *
 * لا يوجد استعلام مكتوب في هذه الصفحة. الفائدة: رقم واحد لكل حقيقة.
 * لو كان التقرير هنا يحسب بنفسه، لأمكن أن يخالف التقرير الرسمي في نفس
 * اليوم — ويصبح السؤال «أي الرقمين أصح؟» بلا جواب.
 */

type ReportKey =
  | 'supplier-balances'
  | 'supplier-ledger'
  | 'purchases-journal'
  | 'supplier-payments'
  | 'purchase-returns'
  | 'stock-balances'
  | 'item-card'
  | 'stock-reconciliation'
  | 'stagnant-items'
  | 'trial-balance';

const REPORTS: {
  key: ReportKey;
  label: string;
  endpoint: 'purchases' | 'inventory' | 'financial';
  desc: string;
}[] = [
  { key: 'supplier-balances', label: 'أرصدة الموردين', endpoint: 'purchases', desc: 'ما علينا لكل مورد من واقع دفتر الأستاذ' },
  { key: 'supplier-ledger', label: 'كشف حساب مورد', endpoint: 'purchases', desc: 'حركة المورد قيداً بقيد مع الرصيد الجاري' },
  { key: 'purchases-journal', label: 'يومية المشتريات', endpoint: 'purchases', desc: 'كل فواتير الشراء وإجماليها' },
  { key: 'supplier-payments', label: 'سجل السدادات', endpoint: 'purchases', desc: 'كل ما دُفع للموردين بطريقة السداد' },
  { key: 'purchase-returns', label: 'مردودات المشتريات', endpoint: 'purchases', desc: 'ما رُدّ للموردين وأثره على الالتزام' },
  { key: 'stock-balances', label: 'أرصدة المخزون', endpoint: 'inventory', desc: 'الكمية والتكلفة والقيمة السوقية لكل صنف' },
  { key: 'item-card', label: 'بطاقة صنف', endpoint: 'inventory', desc: 'حركات صنف واحد والرصيد بعد كل حركة' },
  { key: 'stock-reconciliation', label: 'مطابقة المخزون', endpoint: 'inventory', desc: 'رصيد الصنف مقابل مجموع حركاته — يكشف أي فرق' },
  { key: 'stagnant-items', label: 'الأصناف الراكدة', endpoint: 'inventory', desc: 'رأس مال محتجز في بضاعة بطيئة الحركة' },
  { key: 'trial-balance', label: 'ميزان المراجعة', endpoint: 'financial', desc: 'إثبات توازن مدين ودائن لكل حساب' },
];

export const Reports: React.FC<{ currency: string }> = ({ currency }) => {
  const [active, setActive] = useState<ReportKey>('supplier-balances');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const meta = REPORTS.find((r) => r.key === active)!;

  useEffect(() => {
    (async () => {
      try {
        const [sp, it] = await Promise.all([apiFetch('/api/master/suppliers'), apiFetch('/api/master/items')]);
        setSuppliers(sp.suppliers || []);
        setItems(it.items || []);
        setSupplierId((v) => v || sp.suppliers?.[0]?.supplier_id || '');
        setItemCode((v) => v || it.items?.[0]?.item_code || '');
      } catch {
        /* المستخدم يرى الخطأ عند التحميل نفسه */
      }
    })();
  }, []);

  useEffect(() => {
    if (active === 'supplier-ledger' && !supplierId) return;
    if (active === 'item-card' && !itemCode) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        let url = `/api/reports/${meta.endpoint}?type=${active}`;
        if (active === 'supplier-ledger') url += `&supplier_id=${supplierId}`;
        if (active === 'item-card') url += `&item_code=${itemCode}`;
        const res = await apiFetch(url);
        if (!cancelled) setData(res);
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, supplierId, itemCode]);

  /** تصدير CSV من نفس البيانات المعروضة — بلا حساب جديد */
  const exportCurrent = () => {
    if (!data) return;
    const rows: any[] = data.rows || data.movements || [];
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    exportToCsv(
      `plus-procurement-${active}-${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows.map((r) => headers.map((h) => r[h]))
    );
  };

  const summary = useMemo(() => {
    if (!data) return null;
    if (active === 'supplier-balances') return { label: 'إجمالي المستحق', value: data.grandBalance };
    if (active === 'supplier-ledger' || active === 'item-card') return null;
    if (active === 'trial-balance') return null;
    if (data.totalPurchases !== undefined) return { label: 'إجمالي المشتريات', value: data.totalPurchases };
    if (data.totalPayments !== undefined) return { label: 'إجمالي السدادات', value: data.totalPayments };
    if (data.totalReturns !== undefined) return { label: 'إجمالي المردودات', value: data.totalReturns };
    if (data.totalCostValue !== undefined) return { label: 'قيمة المخزون بالتكلفة', value: data.totalCostValue };
    return null;
  }, [active, data]);

  return (
    <div className="space-y-4">
      <Card title="التقارير" subtitle="كل تقرير يقرأ من نفس استعلامات النظام المحاسبي — لا نسخة ثانية للحساب">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setData(null);
                setActive(r.key);
              }}
              className={`text-right p-2.5 rounded-xl border transition cursor-pointer ${
                active === r.key
                  ? 'bg-[#D4AF37]/12 border-[#D4AF37]/60 text-[#F7F3E8]'
                  : 'bg-[#0F0F14] border-[#D4AF37]/18 hover:border-[#D4AF37]/40 text-[#A9A292]'
              }`}
            >
              <div className="text-[11px] font-bold">{r.label}</div>
              <div className="text-[9px] mt-0.5 leading-relaxed opacity-70">{r.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card
        title={meta.label}
        subtitle={meta.desc}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {active === 'supplier-ledger' && (
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-56">
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.supplier_name}
                  </option>
                ))}
              </Select>
            )}
            {active === 'item-card' && (
              <Select value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="w-56">
                {items.map((i) => (
                  <option key={i.item_code} value={i.item_code}>
                    {i.item_name}
                  </option>
                ))}
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={exportCurrent} disabled={!data}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              طباعة
            </Button>
          </div>
        }
      >
        {loading ? (
          <Spinner label="جارٍ توليد التقرير من قاعدة البيانات…" />
        ) : error ? (
          <Notice tone="err">{error}</Notice>
        ) : !data ? (
          <div className="text-[11px] text-[#7C7565] py-6">لا بيانات</div>
        ) : active === 'supplier-balances' ? (
          <>
            <Table head={['المورد', 'المدينة', 'افتتاحي', 'مدين', 'دائن', 'الرصيد']} empty="لا موردين">
              {data.rows.map((r: any) => (
                <tr key={r.supplier_id} className="hover:bg-[#D4AF37]/5">
                  <td className="py-2 px-2">
                    <div className="text-[11px] font-bold text-[#F7F3E8]">{r.supplier_name}</div>
                    <div className="text-[10px] text-[#7C7565]" dir="ltr">
                      {r.supplier_id}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-[11px]">{r.city}</td>
                  <td className="py-2 px-2">
                    <Num value={r.opening_balance} />
                  </td>
                  <td className="py-2 px-2 text-emerald-300">
                    <Num value={r.total_debit} />
                  </td>
                  <td className="py-2 px-2 text-amber-300">
                    <Num value={r.total_credit} />
                  </td>
                  <td className="py-2 px-2 font-extrabold text-[#E5C158]">
                    <Num value={r.net_balance} />
                  </td>
                </tr>
              ))}
            </Table>
            <TotalRow label="الإجمالي">
              <Money value={data.grandBalance} currency={currency} />
            </TotalRow>
          </>
        ) : active === 'supplier-ledger' ? (
          <>
            <Table head={['التاريخ', 'المستند', 'النوع', 'مدين', 'دائن', 'الرصيد', 'القيد']} empty="لا حركات">
              <tr className="bg-[#D4AF37]/5">
                <td className="py-2 px-2" colSpan={5}>
                  <span className="text-[11px] text-[#A9A292]">رصيد افتتاحي</span>
                </td>
                <td className="py-2 px-2 font-bold text-[#E5C158]">
                  <Num value={data.opening_balance} />
                </td>
                <td />
              </tr>
              {data.rows.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-[#D4AF37]/5">
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {r.tx_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]" dir="ltr">
                    {r.doc_no}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{r.tx_type}</td>
                  <td className="py-2 px-2 text-emerald-300">{Number(r.debit) > 0 ? <Num value={r.debit} /> : '—'}</td>
                  <td className="py-2 px-2 text-amber-300">{Number(r.credit) > 0 ? <Num value={r.credit} /> : '—'}</td>
                  <td className="py-2 px-2 font-bold">
                    <Num value={r.running_balance} />
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {r.journal_entry_number}
                  </td>
                </tr>
              ))}
            </Table>
            <TotalRow label="الرصيد الختامي">
              <Money value={data.closing_balance} currency={currency} />
            </TotalRow>
          </>
        ) : active === 'stock-reconciliation' ? (
          <>
            <Table head={['الصنف', 'رصيد المخزن', 'وارد', 'منصرف', 'رصيد الحركات', 'الفرق', 'الحالة']} empty="لا أصناف">
              {data.rows.map((r: any) => (
                <tr key={r.item_code} className={r.is_matched ? '' : 'bg-red-950/25'}>
                  <td className="py-2 px-2">
                    <div className="text-[11px] font-bold text-[#F7F3E8]">{r.item_name}</div>
                    <div className="text-[10px] text-[#7C7565]" dir="ltr">
                      {r.item_code}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <Num value={r.master_balance} />
                  </td>
                  <td className="py-2 px-2 text-emerald-300">
                    <Num value={r.total_in} />
                  </td>
                  <td className="py-2 px-2 text-red-300">
                    <Num value={r.total_out} />
                  </td>
                  <td className="py-2 px-2">
                    <Num value={r.movements_balance} />
                  </td>
                  <td className={`py-2 px-2 font-bold ${Number(r.variance) === 0 ? 'text-[#8C8474]' : 'text-red-300'}`}>
                    <Num value={r.variance} />
                  </td>
                  <td className="py-2 px-2">
                    {r.is_matched ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> مطابق
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-300">
                        <XCircle className="w-3 h-3" /> فرق
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <TotalRow label="الأصناف المطابقة">
              {data.rows.filter((r: any) => r.is_matched).length} / {data.rows.length}
            </TotalRow>
          </>
        ) : active === 'item-card' ? (
          <>
            <div className="flex flex-wrap gap-3 text-[11px] mb-3">
              <Badge tone="gold">{data.item.item_code}</Badge>
              <span className="font-bold text-[#F7F3E8]">{data.item.item_name}</span>
              <span className="text-[#8C8474]">
                الرصيد <b className="text-[#E5C158]">{Number(data.item.current_balance).toLocaleString('en-US')}</b>
              </span>
            </div>
            <Table head={['التاريخ', 'الحركة', 'المستند', 'وارد', 'منصرف', 'السعر', 'الرصيد بعد']} empty="لا حركات">
              {data.movements.map((m: any) => (
                <tr key={m.id}>
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {m.movement_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{m.movement_type}</td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {m.doc_no}
                  </td>
                  <td className="py-2 px-2 text-emerald-300">{Number(m.qty_in) > 0 ? <Num value={m.qty_in} /> : '—'}</td>
                  <td className="py-2 px-2 text-red-300">{Number(m.qty_out) > 0 ? <Num value={m.qty_out} /> : '—'}</td>
                  <td className="py-2 px-2">
                    <Num value={m.unit_price} />
                  </td>
                  <td className="py-2 px-2 font-bold">
                    <Num value={m.balance_after} />
                  </td>
                </tr>
              ))}
            </Table>
          </>
        ) : active === 'trial-balance' ? (
          <>
            <Table head={['الحساب', 'افتتاحي مدين', 'افتتاحي دائن', 'حركة مدين', 'حركة دائن', 'رصيد مدين', 'رصيد دائن']} empty="لا حسابات">
              {data.rows.map((r: any) => (
                <tr key={r.account_code} className="hover:bg-[#D4AF37]/5">
                  <td className="py-2 px-2">
                    <div className="text-[11px] text-[#F7F3E8]">{r.account_name}</div>
                    <div className="text-[10px] text-[#7C7565]" dir="ltr">
                      {r.account_code}
                    </div>
                  </td>
                  <td className="py-2 px-2">{Number(r.opening_debit) ? <Num value={r.opening_debit} /> : '—'}</td>
                  <td className="py-2 px-2">{Number(r.opening_credit) ? <Num value={r.opening_credit} /> : '—'}</td>
                  <td className="py-2 px-2 text-emerald-300">{Number(r.mov_debit) ? <Num value={r.mov_debit} /> : '—'}</td>
                  <td className="py-2 px-2 text-amber-300">{Number(r.mov_credit) ? <Num value={r.mov_credit} /> : '—'}</td>
                  <td className="py-2 px-2 font-bold">{Number(r.closing_debit) ? <Num value={r.closing_debit} /> : '—'}</td>
                  <td className="py-2 px-2 font-bold">{Number(r.closing_credit) ? <Num value={r.closing_credit} /> : '—'}</td>
                </tr>
              ))}
            </Table>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#0F0F14] border border-[#D4AF37]/20 flex justify-between">
                <span className="text-[#9A9282]">إجمالي الحركة المدينة</span>
                <span className="font-bold text-emerald-300">
                  <Num value={data.totals.mov_debit} />
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0F0F14] border border-[#D4AF37]/20 flex justify-between">
                <span className="text-[#9A9282]">إجمالي الحركة الدائنة</span>
                <span className="font-bold text-amber-300">
                  <Num value={data.totals.mov_credit} />
                </span>
              </div>
            </div>
            {Math.abs(Number(data.totals.mov_debit) - Number(data.totals.mov_credit)) < 0.01 ? (
              <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> القيود متوازنة تماماً — لا فرق بين المدين والدائن
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> فرق بين المدين والدائن — يحتاج مراجعة
              </div>
            )}
          </>
        ) : (
          <>
            <GenericTable rows={data.rows || []} currency={currency} />
            {summary && (
              <TotalRow label={summary.label}>
                <Money value={summary.value} currency={currency} />
              </TotalRow>
            )}
          </>
        )}
      </Card>

      <div className="text-[10px] text-[#6F6A5D] flex items-center gap-1.5">
        <FileSpreadsheet className="w-3 h-3" />
        تصدير CSV يخرج بالبيانات المعروضة نفسها بلا حساب جديد — ما تراه هو ما يُصدَّر.
      </div>
    </div>
  );
};

/** جدول عام لأي تقرير: يعرض كل الأعمدة القادمة من الخادم بأسمائها */
const GenericTable: React.FC<{ rows: any[]; currency: string }> = ({ rows }) => {
  const columns = useMemo(() => {
    if (!rows.length) return [];
    const skip = new Set(['id', 'line_no', 'before_json', 'payload_json']);
    return Object.keys(rows[0]).filter((k) => !skip.has(k));
  }, [rows]);

  const moneyish = (key: string) => /amount|total|debit|credit|balance|value|cost|price|vat/i.test(key);

  if (!rows.length) return <div className="py-8 text-center text-[11px] text-[#7C7565]">لا بيانات لهذا التقرير</div>;

  return (
    <Table head={columns} empty="لا بيانات">
      {rows.map((r, i) => (
        <tr key={i} className="hover:bg-[#D4AF37]/5">
          {columns.map((c) => (
            <td key={c} className="py-2 px-2 whitespace-nowrap">
              {moneyish(c) && typeof r[c] === 'number' ? (
                <Num value={r[c]} />
              ) : (
                <span className="text-[11px]">{r[c] === null || r[c] === undefined ? '—' : String(r[c])}</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
};
