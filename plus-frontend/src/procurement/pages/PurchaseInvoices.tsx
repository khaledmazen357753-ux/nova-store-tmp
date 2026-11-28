import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Receipt, Calculator } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Money, Badge, Table, Spinner, Notice, Button, Input, Select, Field, today } from './ui';

/**
 * فواتير الشراء — قلب الموقع.
 *
 * كل حفظ هنا يمرّ على `createPurchaseInvoiceRaw` في المحرك الحقيقي:
 *   • قيد يومية: المخزون مدين / المورد دائن (أو الخزينة/البنك عند السداد الفوري)
 *   • زيادة رصيد كل صنف + تعديل تكلفته
 *   • حركة في بطاقة الصنف
 *   • حركة في حساب المورد
 *
 * الدليل على أن ذلك يحدث فعلاً: العمود «القيد» في سجل الفواتير، وشاشة
 * بطاقة الصنف، ولوحة التوازن. ولو كان الحفظ صفاً في جدول فقط لظهرت
 * الفاتورة واختفت من الأستاذ — وهو ما لا يحدث.
 */

interface Line {
  item_code: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

export const PurchaseInvoices: React.FC<{ currency: string; canWrite: boolean; onCreated?: () => void }> = ({
  currency,
  canWrite,
  onCreated,
}) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [header, setHeader] = useState({
    invoice_date: today(),
    supplier_id: '',
    po_no: '',
    payment_method: 'آجل',
    bank_account_number: '',
    notes: '',
  });
  const [lines, setLines] = useState<Line[]>([]);

  const load = async () => {
    try {
      const [inv, it, sp, po, bk] = await Promise.all([
        apiFetch('/api/transactions/purchase-invoices'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/suppliers'),
        apiFetch('/api/transactions/purchase-orders'),
        apiFetch('/api/master/banks'),
      ]);
      setInvoices(inv.invoices || []);
      setItems(it.items || []);
      setSuppliers(sp.suppliers || []);
      setOrders((po.orders || []).filter((o: any) => o.status === 'قيد التنفيذ'));
      setBanks(bk.banks || []);
      if (!header.supplier_id && sp.suppliers?.length) {
        setHeader((h) => ({ ...h, supplier_id: sp.suppliers[0].supplier_id }));
      }
      if (header.payment_method !== 'نقدي' && !header.bank_account_number && bk.banks?.length) {
        setHeader((h) => ({ ...h, bank_account_number: bk.banks[0].bank_account_number }));
      }
      if (lines.length === 0 && it.items?.length) {
        const first = it.items[0];
        setLines([{ item_code: first.item_code, quantity: 1, unit_price: Number(first.cost_price), discount_percent: 0 }]);
      }
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // عند اختيار أمر توريد: نملأ البنود من الأمر فعلياً — لا نسخ يدوي.
  const applyOrder = (poNo: string) => {
    const po = orders.find((o) => o.po_no === poNo);
    setHeader((h) => ({ ...h, po_no: poNo, supplier_id: po?.supplier_id || h.supplier_id }));
    if (po?.items?.length) {
      setLines(
        po.items.map((it: any) => ({
          item_code: it.item_code,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_percent: 0,
        }))
      );
    }
  };

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const computed = lines.map((l) => {
    const gross = Number(l.quantity || 0) * Number(l.unit_price || 0);
    const disc = gross * (Number(l.discount_percent || 0) / 100);
    return { ...l, gross, disc, net: gross - disc };
  });
  const totals = useMemo(
    () => ({
      gross: computed.reduce((s, l) => s + l.gross, 0),
      disc: computed.reduce((s, l) => s + l.disc, 0),
      net: computed.reduce((s, l) => s + l.net, 0),
    }),
    [computed]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/purchase-invoices', {
        method: 'POST',
        body: JSON.stringify({ ...header, po_no: header.po_no || null, items: lines }),
      });
      setMsg({
        tone: 'ok',
        text: `${res.message} — رقم الفاتورة ${res.invoice_no} · القيد ${res.journal_entry_number} · الصافي ${Number(
          res.net_total
        ).toLocaleString('en-US')} ${currency}`,
      });
      setLines([]);
      setHeader((h) => ({ ...h, notes: '', po_no: '' }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="جارٍ تحميل فواتير الشراء…" />;

  return (
    <div className="space-y-4">
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}

      {canWrite ? (
        <Card
          title="تسجيل فاتورة شراء"
          subtitle="الحفظ يُنشئ قيد يومية متوازناً ويضيف الكميات للمخزون ويُحدّث رصيد المورد في خطوة واحدة"
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <Field label="تاريخ الفاتورة">
                <Input type="date" value={header.invoice_date} onChange={(e) => setHeader({ ...header, invoice_date: e.target.value })} required />
              </Field>
              <Field label="المورد">
                <Select value={header.supplier_id} onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })} required>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ربط بأمر توريد" hint="اختيار الأمر يجلب بنوده تلقائياً">
                <Select value={header.po_no} onChange={(e) => applyOrder(e.target.value)}>
                  <option value="">— بدون أمر توريد —</option>
                  {orders.map((o) => (
                    <option key={o.po_no} value={o.po_no}>
                      {o.po_no} · {o.supplier_name} · {Number(o.total_amount).toLocaleString('en-US')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="طريقة السداد">
                <Select value={header.payment_method} onChange={(e) => setHeader({ ...header, payment_method: e.target.value })}>
                  <option value="آجل">آجل (على حساب المورد)</option>
                  <option value="نقدي">نقدي من الخزينة</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                </Select>
              </Field>
              {header.payment_method !== 'نقدي' && header.payment_method !== 'آجل' && (
                <Field label="الحساب البنكي">
                  <Select
                    value={header.bank_account_number}
                    onChange={(e) => setHeader({ ...header, bank_account_number: e.target.value })}
                  >
                    {banks.map((b) => (
                      <option key={b.bank_account_number} value={b.bank_account_number}>
                        {b.bank_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            <Table head={['الصنف', 'الرصيد الحالي', 'الكمية', 'سعر الشراء', 'خصم %', 'الصافي', '']}>
              {computed.map((l, i) => {
                const item = items.find((x) => x.item_code === l.item_code);
                return (
                  <tr key={i}>
                    <td className="py-2 px-2 min-w-[220px]">
                      <Select
                        value={l.item_code}
                        onChange={(e) => {
                          const found = items.find((x) => x.item_code === e.target.value);
                          setLine(i, { item_code: e.target.value, unit_price: Number(found?.cost_price || 0) });
                        }}
                      >
                        {items.map((it) => (
                          <option key={it.item_code} value={it.item_code}>
                            {it.item_name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 px-2 text-[11px] text-[#A9A292] tabular-nums" dir="ltr">
                      {Number(item?.current_balance || 0).toLocaleString('en-US')}
                    </td>
                    <td className="py-2 px-2 w-24">
                      <Input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value || 1) })} />
                    </td>
                    <td className="py-2 px-2 w-28">
                      <Input type="number" min="0" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: Number(e.target.value || 0) })} />
                    </td>
                    <td className="py-2 px-2 w-20">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={l.discount_percent}
                        onChange={(e) => setLine(i, { discount_percent: Number(e.target.value || 0) })}
                      />
                    </td>
                    <td className="py-2 px-2 font-bold text-emerald-300 whitespace-nowrap">
                      <Money value={l.net} currency={currency} />
                    </td>
                    <td className="py-2 px-2">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => setLines(lines.filter((_, x) => x !== i))} className="text-red-400 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>

            <div className="grid sm:grid-cols-2 gap-3 items-start">
              <Field label="ملاحظات الفاتورة">
                <Input value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} placeholder="رقم فاتورة المورد، شروط التوريد…" />
              </Field>
              <div className="flex flex-wrap items-center justify-end gap-4 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLines([
                      ...lines,
                      {
                        item_code: items[0]?.item_code || '',
                        quantity: 1,
                        unit_price: Number(items[0]?.cost_price || 0),
                        discount_percent: 0,
                      },
                    ])
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> صنف
                </Button>
                <div className="text-[11px] text-[#8C8474] leading-relaxed text-left">
                  <div>
                    إجمالي قبل الخصم: <Money value={totals.gross} currency={currency} />
                  </div>
                  <div>
                    خصم: <Money value={totals.disc} currency={currency} />
                  </div>
                </div>
                <span className="text-sm font-extrabold text-emerald-300">
                  الصافي: <Money value={totals.net} currency={currency} />
                </span>
                <Button type="submit" disabled={busy || lines.length === 0 || totals.net <= 0}>
                  <Receipt className="w-4 h-4" /> {busy ? 'جارٍ الترحيل…' : 'حفظ وترحيل الفاتورة'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : (
        <Notice tone="err">
          صلاحيتك في هذا الموقع لا تسمح بتسجيل فواتير الشراء — يمكنك استعراض السجل والتقارير فقط.
        </Notice>
      )}

      <Card
        title={`سجل فواتير الشراء (${invoices.length})`}
        subtitle="اضغط على الفاتورة لعرض بنودها وربطها بالقيد"
      >
        <Table head={['الفاتورة', 'التاريخ', 'المورد', 'الأمر', 'السداد', 'الصافي', 'القيد', '']} empty="لا فواتير بعد">
          {invoices.map((inv) => (
            <React.Fragment key={inv.invoice_no}>
              <tr className="hover:bg-[#D4AF37]/5 cursor-pointer" onClick={() => setExpanded(expanded === inv.invoice_no ? null : inv.invoice_no)}>
                <td className="py-2 px-2 text-[11px] font-bold text-[#F7F3E8]" dir="ltr">
                  {inv.invoice_no}
                </td>
                <td className="py-2 px-2 text-[10px]" dir="ltr">
                  {inv.invoice_date}
                </td>
                <td className="py-2 px-2 text-[11px]">{inv.supplier_name}</td>
                <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                  {inv.po_no || '—'}
                </td>
                <td className="py-2 px-2">
                  <Badge tone={inv.payment_method === 'آجل' ? 'gold' : 'green'}>{inv.payment_method}</Badge>
                </td>
                <td className="py-2 px-2 font-extrabold text-[#E5C158]">
                  <Money value={inv.net_total} currency={currency} />
                </td>
                <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                  {inv.journal_entry_number || '—'}
                </td>
                <td className="py-2 px-2 text-[10px] text-[#6F6A5D]">{expanded === inv.invoice_no ? '▲' : '▼'}</td>
              </tr>
              {expanded === inv.invoice_no && (
                <tr>
                  <td colSpan={8} className="p-3 bg-[#0C0C11]">
                    <div className="text-[10px] text-[#8C8474] mb-2 flex items-center gap-1.5">
                      <Calculator className="w-3 h-3" /> بنود الفاتورة ومصدرها
                    </div>
                    <table className="w-full text-[11px] text-right">
                      <thead className="text-[#8C8474]">
                        <tr>
                          <th className="py-1 px-2">الصنف</th>
                          <th className="py-1 px-2">الكمية</th>
                          <th className="py-1 px-2">السعر</th>
                          <th className="py-1 px-2">خصم</th>
                          <th className="py-1 px-2">الصافي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items?.map((it: any) => (
                          <tr key={it.line_no} className="border-t border-[#D4AF37]/10">
                            <td className="py-1 px-2 text-[#F7F3E8]">{it.item_name}</td>
                            <td className="py-1 px-2 tabular-nums" dir="ltr">
                              {Number(it.quantity).toLocaleString('en-US')} {it.unit_of_measure}
                            </td>
                            <td className="py-1 px-2 tabular-nums" dir="ltr">
                              {Number(it.unit_price).toLocaleString('en-US')}
                            </td>
                            <td className="py-1 px-2 tabular-nums" dir="ltr">
                              {Number(it.discount_percent || 0)}%
                            </td>
                            <td className="py-1 px-2 font-bold text-emerald-300 tabular-nums" dir="ltr">
                              {Number(it.net_amount).toLocaleString('en-US')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inv.notes && <div className="text-[10px] text-[#7C7565] mt-2">ملاحظات: {inv.notes}</div>}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </Table>
      </Card>
    </div>
  );
};
