import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Wallet, Landmark, Receipt } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Money, Badge, Table, Spinner, Notice, Button, Input, Select, Field, Tabs, today } from './ui';

/**
 * شاشتان في صفحة واحدة لأن بينهما علاقة مباشرة:
 *
 *   • إشعار رد مشتريات — يخفّض المخزون ويخفّض ما علينا للمورد (أو يرد نقداً).
 *   • سداد مورد — يخفّض ما علينا نقداً أو بشيك أو تحويل.
 *
 * الاثنان يقفلان حساب المورد، لكن بأثر مختلف في المخزون. فصلهما في
 * صفحتين كان سيجعل الفرق غير مرئي: أحدهما يمسّ البضاعة والآخر لا.
 */

type Tab = 'returns' | 'payments';

export const ReturnsPayments: React.FC<{ currency: string; canWrite: boolean; onCreated?: () => void }> = ({
  currency,
  canWrite,
  onCreated,
}) => {
  const [tab, setTab] = useState<Tab>('returns');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [retForm, setRetForm] = useState({
    return_date: today(),
    supplier_id: '',
    invoice_no: '',
    refund_method: 'خصم من الحساب',
    item_code: '',
    quantity: 1,
    unit_price: 0,
    reason: '',
  });

  const [payForm, setPayForm] = useState({
    supplier_id: '',
    tx_date: today(),
    amount: 0,
    payment_method: 'نقدي',
    bank_account_number: '',
    check_number: '',
    notes: '',
  });

  const load = async () => {
    try {
      const [sp, it, bk, inv, ret, pay] = await Promise.all([
        apiFetch('/api/master/suppliers'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/banks'),
        apiFetch('/api/transactions/purchase-invoices'),
        apiFetch('/api/transactions/purchase-returns'),
        apiFetch('/api/transactions/supplier-payments'),
      ]);
      setSuppliers(sp.suppliers || []);
      setItems(it.items || []);
      setBanks(bk.banks || []);
      setInvoices(inv.invoices || []);
      setReturns(ret.returns || []);
      setPayments(pay.payments || []);

      const firstSupplier = sp.suppliers?.[0];
      const returnable = (it.items || []).find((x: any) => Number(x.current_balance) > 0) || it.items?.[0];
      setRetForm((f) => ({
        ...f,
        supplier_id: f.supplier_id || firstSupplier?.supplier_id || '',
        item_code: f.item_code || returnable?.item_code || '',
        unit_price: f.unit_price || Number(returnable?.cost_price || 0),
      }));
      setPayForm((f) => ({
        ...f,
        supplier_id: f.supplier_id || firstSupplier?.supplier_id || '',
        amount: f.amount || Number(firstSupplier?.net_balance || 0),
        bank_account_number: f.bank_account_number || bk.banks?.[0]?.bank_account_number || '',
      }));
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/purchase-returns', {
        method: 'POST',
        body: JSON.stringify({
          return_date: retForm.return_date,
          supplier_id: retForm.supplier_id,
          invoice_no: retForm.invoice_no || null,
          refund_method: retForm.refund_method,
          reason: retForm.reason,
          items: [{ item_code: retForm.item_code, quantity: retForm.quantity, unit_price: retForm.unit_price }],
        }),
      });
      setMsg({
        tone: 'ok',
        text: `${res.message} — الإشعار ${res.return_no} بقيمة ${Number(res.total_amount).toLocaleString('en-US')} ${currency} · القيد ${
          res.journal_entry_number
        }`,
      });
      setRetForm((f) => ({ ...f, reason: '', quantity: 1 }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/supplier-payments', {
        method: 'POST',
        body: JSON.stringify(payForm),
      });
      setMsg({
        tone: 'ok',
        text: `${res.message} — السند ${res.doc_no} · القيد ${res.journal_entry_number} · رصيد المورد الآن ${Number(
          res.new_supplier_balance
        ).toLocaleString('en-US')} ${currency}`,
      });
      setPayForm((f) => ({ ...f, notes: '', check_number: '' }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.supplier_id === payForm.supplier_id),
    [suppliers, payForm.supplier_id]
  );

  if (loading) return <Spinner label="جارٍ تحميل المردودات والسدادات…" />;

  return (
    <div className="space-y-4">
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'returns' as Tab, label: 'إشعار رد مشتريات', icon: <RotateCcw className="w-3.5 h-3.5" /> },
          { id: 'payments' as Tab, label: 'سداد مورد', icon: <Wallet className="w-3.5 h-3.5" /> },
        ]}
      />

      {tab === 'returns' && (
        <>
          {canWrite ? (
            <Card
              title="إشعار رد مشتريات للمورد"
              subtitle="يخفّض رصيد الصنف من المخزن وأيضاً الالتزام تجاه المورد في قيد واحد متوازن"
            >
              <form onSubmit={submitReturn} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Field label="تاريخ الإشعار">
                    <Input type="date" value={retForm.return_date} onChange={(e) => setRetForm({ ...retForm, return_date: e.target.value })} required />
                  </Field>
                  <Field label="المورد">
                    <Select value={retForm.supplier_id} onChange={(e) => setRetForm({ ...retForm, supplier_id: e.target.value })} required>
                      {suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.supplier_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="فاتورة الشراء الأصلية" hint="اختياري — للربط بالمستند">
                    <Select value={retForm.invoice_no} onChange={(e) => setRetForm({ ...retForm, invoice_no: e.target.value })}>
                      <option value="">— غير مرتبطة —</option>
                      {invoices.map((inv) => (
                        <option key={inv.invoice_no} value={inv.invoice_no}>
                          {inv.invoice_no} · {inv.supplier_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="طريقة التسوية">
                    <Select value={retForm.refund_method} onChange={(e) => setRetForm({ ...retForm, refund_method: e.target.value })}>
                      <option value="خصم من الحساب">خصم من حساب المورد</option>
                      <option value="نقدي">استرداد نقدي</option>
                    </Select>
                  </Field>
                  <Field label="الصنف المرتجع">
                    <Select
                      value={retForm.item_code}
                      onChange={(e) => {
                        const found = items.find((x) => x.item_code === e.target.value);
                        setRetForm({ ...retForm, item_code: e.target.value, unit_price: Number(found?.cost_price || 0) });
                      }}
                    >
                      {items.map((it) => (
                        <option key={it.item_code} value={it.item_code}>
                          {it.item_name} — رصيد {it.current_balance}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="الكمية المرتجعة">
                    <Input type="number" min="1" value={retForm.quantity} onChange={(e) => setRetForm({ ...retForm, quantity: Number(e.target.value || 1) })} />
                  </Field>
                  <Field label="سعر الرد">
                    <Input type="number" min="0" value={retForm.unit_price} onChange={(e) => setRetForm({ ...retForm, unit_price: Number(e.target.value || 0) })} />
                  </Field>
                  <Field label="سبب الرد">
                    <Input value={retForm.reason} onChange={(e) => setRetForm({ ...retForm, reason: e.target.value })} placeholder="عيب صناعة، تلف، مخالف للمواصفات…" required />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-amber-300">
                    قيمة الإشعار: <Money value={retForm.quantity * retForm.unit_price} currency={currency} />
                  </span>
                  <Button type="submit" disabled={busy || !retForm.reason.trim()}>
                    <RotateCcw className="w-4 h-4" /> {busy ? 'جارٍ الحفظ…' : 'حفظ الإشعار'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Notice tone="err">لا تملك صلاحية إنشاء إشعارات الرد.</Notice>
          )}

          <Card title={`إشعارات الرد (${returns.length})`}>
            <Table head={['الإشعار', 'التاريخ', 'المورد', 'الفاتورة', 'التسوية', 'القيمة', 'القيد']} empty="لا إشعارات رد">
              {returns.map((r: any) => (
                <tr key={r.return_no}>
                  <td className="py-2 px-2 text-[11px] font-bold" dir="ltr">
                    {r.return_no}
                  </td>
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {r.return_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{r.supplier_name}</td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {r.invoice_no || '—'}
                  </td>
                  <td className="py-2 px-2">
                    <Badge tone={r.refund_method === 'نقدي' ? 'green' : 'gold'}>{r.refund_method}</Badge>
                  </td>
                  <td className="py-2 px-2 font-bold text-amber-300">
                    <Money value={r.total_amount} currency={currency} />
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {r.journal_entry_number || '—'}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === 'payments' && (
        <>
          {canWrite ? (
            <Card
              title="سداد مستحقات مورد"
              subtitle="يُنشئ سند صرف وقيداً: المورد مدين / الخزينة أو البنك دائن — وخفض فوري لرصيد المورد"
            >
              <form onSubmit={submitPayment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Field label="المورد" hint={selectedSupplier ? `المستحق الحالي: ${Number(selectedSupplier.net_balance).toLocaleString('en-US')} ${currency}` : undefined}>
                    <Select
                      value={payForm.supplier_id}
                      onChange={(e) => {
                        const found = suppliers.find((s) => s.supplier_id === e.target.value);
                        setPayForm({ ...payForm, supplier_id: e.target.value, amount: Number(found?.net_balance || 0) });
                      }}
                      required
                    >
                      {suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.supplier_name} — {Number(s.net_balance).toLocaleString('en-US')}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="تاريخ السداد">
                    <Input type="date" value={payForm.tx_date} onChange={(e) => setPayForm({ ...payForm, tx_date: e.target.value })} required />
                  </Field>
                  <Field label="المبلغ">
                    <Input type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value || 0) })} required />
                  </Field>
                  <Field label="طريقة السداد">
                    <Select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                      <option value="نقدي">نقدي من الخزينة</option>
                      <option value="شيك">شيك بنكي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                    </Select>
                  </Field>
                  {payForm.payment_method !== 'نقدي' && (
                    <Field label="الحساب البنكي">
                      <Select value={payForm.bank_account_number} onChange={(e) => setPayForm({ ...payForm, bank_account_number: e.target.value })}>
                        {banks.map((b) => (
                          <option key={b.bank_account_number} value={b.bank_account_number}>
                            {b.bank_name} — {Number(b.balance).toLocaleString('en-US')}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  {payForm.payment_method === 'شيك' && (
                    <Field label="رقم الشيك">
                      <Input value={payForm.check_number} onChange={(e) => setPayForm({ ...payForm, check_number: e.target.value })} placeholder="CHQ-…" dir="ltr" />
                    </Field>
                  )}
                  <Field label="ملاحظات" className="sm:col-span-2">
                    <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="مرجع التحويل أو سبب السداد" />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-emerald-300">
                    المبلغ: <Money value={payForm.amount} currency={currency} />
                  </span>
                  <Button type="submit" disabled={busy || payForm.amount <= 0}>
                    <Landmark className="w-4 h-4" /> {busy ? 'جارٍ الحفظ…' : 'تسجيل السداد'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Notice tone="err">لا تملك صلاحية تسجيل السدادات.</Notice>
          )}

          <Card title={`سندات السداد (${payments.length})`} subtitle="السداد الفوري داخل الفاتورة يظهر هنا أيضاً كحركة مستقلة">
            <Table head={['السند', 'التاريخ', 'المورد', 'النوع', 'الطريقة', 'المبلغ', 'القيد']} empty="لا سدادات">
              {payments.map((p: any) => (
                <tr key={`${p.id}-${p.doc_no}`}>
                  <td className="py-2 px-2 text-[11px] font-bold" dir="ltr">
                    {p.doc_no}
                  </td>
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {p.tx_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{p.supplier_name}</td>
                  <td className="py-2 px-2">
                    <Badge tone={String(p.tx_type).includes('فوري') ? 'green' : 'gray'}>{p.tx_type}</Badge>
                  </td>
                  <td className="py-2 px-2 text-[10px]">{p.payment_method}</td>
                  <td className="py-2 px-2 font-bold text-emerald-300">
                    <Money value={p.debit} currency={currency} />
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {p.journal_entry_number || '—'}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      <Card title="الفرق بين الشاشتين">
        <div className="grid sm:grid-cols-2 gap-3 text-[11px] text-[#A9A292] leading-relaxed">
          <div className="flex gap-2">
            <Receipt className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <b className="text-[#E5C158]">إشعار الرد</b> يقلّل المخزون فعلياً — البضاعة خرجت من المخزن إلى المورد.
            </span>
          </div>
          <div className="flex gap-2">
            <Wallet className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <b className="text-[#E5C158]">السداد</b> لا يمسّ المخزون — البضاعة باقية، والمال فقط هو الذي تحرّك.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
