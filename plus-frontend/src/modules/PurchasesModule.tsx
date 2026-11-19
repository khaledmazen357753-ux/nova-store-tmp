import React, { useEffect, useState } from 'react';
import { ClipboardList, FileSpreadsheet, RotateCcw, Wallet, Plus, Trash2 } from 'lucide-react';
import { apiFetch, fmtMoney, fmtNum, todayIso } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type PurTab = 'po' | 'invoice' | 'returns' | 'payments';

export const PurchasesModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<PurTab>('invoice');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // أمر توريد
  const [poForm, setPoForm] = useState({
    po_date: todayIso(),
    supplier_id: 'SUP-001',
    expected_date: todayIso(),
    item_code: 'ITM-103',
    quantity: 20,
    unit_price: 5500,
    notes: 'أمر توريد لتعويض المخزون',
  });

  // فاتورة شراء
  const [invHeader, setInvHeader] = useState({
    invoice_date: todayIso(),
    supplier_id: 'SUP-001',
    po_no: '',
    payment_method: 'آجل',
    bank_account_number: '',
    notes: '',
  });
  const [invLines, setInvLines] = useState([
    { item_code: 'ITM-103', quantity: 10, unit_price: 5500, discount_percent: 0 },
  ]);

  // رد مشتريات
  const [retForm, setRetForm] = useState({
    return_date: todayIso(),
    supplier_id: 'SUP-001',
    refund_method: 'خصم من الحساب',
    item_code: 'ITM-103',
    quantity: 1,
    unit_price: 5500,
    reason: 'إشعار رد بضاعة معيبة للمورد',
  });

  // سداد مورد
  const [payForm, setPayForm] = useState({
    supplier_id: 'SUP-001',
    tx_date: todayIso(),
    amount: 20000,
    payment_method: 'نقدي',
    bank_account_number: '',
    check_number: '',
    notes: 'سداد جزء من الحساب المستحق للمورد',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, iRes, bRes, poRes, invRes, retRes, payRes] = await Promise.all([
        apiFetch('/api/master/suppliers'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/banks'),
        apiFetch('/api/transactions/purchase-orders'),
        apiFetch('/api/transactions/purchase-invoices'),
        apiFetch('/api/transactions/purchase-returns'),
        apiFetch('/api/transactions/supplier-payments'),
      ]);
      setSuppliers(sRes.suppliers || []);
      setItems(iRes.items || []);
      setBanks(bRes.banks || []);
      setOrders(poRes.orders || []);
      setInvoices(invRes.invoices || []);
      setReturns(retRes.returns || []);
      setPayments(payRes.payments || []);
      if (bRes.banks?.length) {
        setInvHeader((p) => ({ ...p, bank_account_number: p.bank_account_number || bRes.banks[0].bank_account_number }));
        setPayForm((p) => ({ ...p, bank_account_number: p.bank_account_number || bRes.banks[0].bank_account_number }));
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const computedLines = invLines.map((l) => {
    const gross = l.quantity * l.unit_price;
    const disc = gross * ((l.discount_percent || 0) / 100);
    return { ...l, gross, disc, net: gross - disc };
  });
  const netTotal = computedLines.reduce((s, l) => s + l.net, 0);

  if (loading) return <PlusSpinner label="جارٍ تحميل وحدة المشتريات وحسابات الموردين..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'invoice', label: 'فاتورة شراء وتوريد للمخزن', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'po', label: 'أوامر التوريد (PO)', icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'returns', label: 'إشعار رد مشتريات', icon: <RotateCcw className="w-4 h-4" /> },
          { id: 'payments', label: 'سداد لمورد', icon: <Wallet className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as PurTab); setMsg(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
              tab === t.id ? 'gold-metallic-btn' : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl text-sm border ${
          msg.type === 'ok' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' : 'bg-red-950/60 border-red-500/50 text-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* 1. فاتورة شراء */}
      {tab === 'invoice' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/purchase-invoices', {
                  method: 'POST',
                  body: JSON.stringify({ ...invHeader, po_no: invHeader.po_no || null, items: invLines }),
                });
                setMsg({ type: 'ok', text: `${res.message} — فاتورة رقم ${res.invoice_no}` });
                loadData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="royal-card rounded-2xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold gold-gradient-text">تسجيل فاتورة شراء من مورد (إضافة آلية للمخزن + قيد يومية)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-[#C7BFA9]">تاريخ الفاتورة</label>
                <input type="date" value={invHeader.invoice_date} onChange={(e) => setInvHeader({ ...invHeader, invoice_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">المورد</label>
                <select value={invHeader.supplier_id} onChange={(e) => setInvHeader({ ...invHeader, supplier_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">ربط بأمر توريد (اختياري)</label>
                <select value={invHeader.po_no} onChange={(e) => setInvHeader({ ...invHeader, po_no: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  <option value="">— بدون أمر توريد —</option>
                  {orders.filter((o) => o.status === 'قيد التنفيذ').map((o) => (
                    <option key={o.po_no} value={o.po_no}>{o.po_no} ({fmtMoney(o.total_amount, currency)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">طريقة السداد</label>
                <select value={invHeader.payment_method} onChange={(e) => setInvHeader({ ...invHeader, payment_method: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  <option value="آجل">آجل (على حساب المورد)</option>
                  <option value="نقدي">نقدي</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">الصنف</th>
                    <th className="py-2 px-2 w-28">الكمية المشتراة</th>
                    <th className="py-2 px-2 w-32">سعر الشراء</th>
                    <th className="py-2 px-2 w-24">خصم %</th>
                    <th className="py-2 px-2 w-36">الصافي</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                  {computedLines.map((l, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2">
                        <select
                          value={l.item_code}
                          onChange={(e) => {
                            const found = items.find((i) => i.item_code === e.target.value);
                            const copy = [...invLines];
                            copy[idx] = { ...copy[idx], item_code: e.target.value, unit_price: found?.cost_price || 0 };
                            setInvLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        >
                          {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" min="1" value={l.quantity} onChange={(e) => { const c = [...invLines]; c[idx].quantity = Number(e.target.value || 1); setInvLines(c); }} className="w-full gold-input rounded-lg px-2.5 py-2 text-xs" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" min="0" value={l.unit_price} onChange={(e) => { const c = [...invLines]; c[idx].unit_price = Number(e.target.value || 0); setInvLines(c); }} className="w-full gold-input rounded-lg px-2.5 py-2 text-xs" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" min="0" max="100" value={l.discount_percent} onChange={(e) => { const c = [...invLines]; c[idx].discount_percent = Number(e.target.value || 0); setInvLines(c); }} className="w-full gold-input rounded-lg px-2.5 py-2 text-xs" />
                      </td>
                      <td className="py-2 px-2 font-bold text-emerald-300">{fmtMoney(l.net, currency)}</td>
                      <td className="py-2 px-2">
                        {invLines.length > 1 && (
                          <button type="button" onClick={() => setInvLines(invLines.filter((_, i) => i !== idx))} className="text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInvLines([...invLines, { item_code: items[0]?.item_code || 'ITM-101', quantity: 5, unit_price: items[0]?.cost_price || 1000, discount_percent: 0 }])}
                className="px-3.5 py-2 rounded-xl text-xs bg-[#14141B] border border-[#D4AF37]/35 text-[#E5C158] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> إضافة صنف للفاتورة
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm font-extrabold text-emerald-300 tabular-nums">صافي فاتورة الشراء: {fmtMoney(netTotal, currency)}</span>
                <button type="submit" className="gold-metallic-btn px-6 py-2.5 rounded-xl text-xs cursor-pointer">حفظ فاتورة الشراء</button>
              </div>
            </div>
          </form>

          <div className="royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل فواتير الشراء ({invoices.length})</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم الفاتورة</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">المورد</th>
                  <th className="py-2 px-2">أمر التوريد</th>
                  <th className="py-2 px-2">السداد</th>
                  <th className="py-2 px-2">الصافي</th>
                  <th className="py-2 px-2">رقم القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {invoices.map((inv) => (
                  <tr key={inv.invoice_no}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{inv.invoice_no}</td>
                    <td className="py-2.5 px-2">{inv.invoice_date}</td>
                    <td className="py-2.5 px-2 font-bold">{inv.supplier_name}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{inv.po_no || '—'}</td>
                    <td className="py-2.5 px-2">{inv.payment_method}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(inv.net_total, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{inv.journal_entry_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. أوامر التوريد */}
      {tab === 'po' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/purchase-orders', {
                  method: 'POST',
                  body: JSON.stringify({
                    po_date: poForm.po_date,
                    supplier_id: poForm.supplier_id,
                    expected_date: poForm.expected_date,
                    notes: poForm.notes,
                    items: [{ item_code: poForm.item_code, quantity: poForm.quantity, unit_price: poForm.unit_price }],
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} — رقم الأمر: ${res.po_no}` });
                loadData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إصدار أمر توريد لمورد</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">تاريخ الإصدار</label>
                <input type="date" value={poForm.po_date} onChange={(e) => setPoForm({ ...poForm, po_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">تاريخ التوريد المتوقع</label>
                <input type="date" value={poForm.expected_date} onChange={(e) => setPoForm({ ...poForm, expected_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <select value={poForm.supplier_id} onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
            <select
              value={poForm.item_code}
              onChange={(e) => {
                const it = items.find((x) => x.item_code === e.target.value);
                setPoForm({ ...poForm, item_code: e.target.value, quantity: it?.eoq || 15, unit_price: it?.cost_price || 0 });
              }}
              className="w-full gold-input rounded-xl px-3 py-2 text-xs"
            >
              {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name} (EOQ: {fmtNum(it.eoq)})</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">الكمية المطلوبة</label>
                <input type="number" min="1" value={poForm.quantity} onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">السعر التقديري</label>
                <input type="number" value={poForm.unit_price} onChange={(e) => setPoForm({ ...poForm, unit_price: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <input placeholder="ملاحظات وشروط التوريد" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ وإصدار أمر التوريد</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">أوامر التوريد المسجلة</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم الأمر</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">المورد</th>
                  <th className="py-2 px-2">القيمة التقديرية</th>
                  <th className="py-2 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {orders.map((o) => (
                  <tr key={o.po_no}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{o.po_no}</td>
                    <td className="py-2.5 px-2">{o.po_date}</td>
                    <td className="py-2.5 px-2 font-bold">{o.supplier_name}</td>
                    <td className="py-2.5 px-2">{fmtMoney(o.total_amount, currency)}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        o.status === 'تم الاستلام' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. إشعار رد مشتريات */}
      {tab === 'returns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/purchase-returns', {
                  method: 'POST',
                  body: JSON.stringify({
                    return_date: retForm.return_date,
                    supplier_id: retForm.supplier_id,
                    refund_method: retForm.refund_method,
                    reason: retForm.reason,
                    items: [{ item_code: retForm.item_code, quantity: retForm.quantity, unit_price: retForm.unit_price }],
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} (${res.return_no})` });
                loadData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إصدار إشعار رد مشتريات لمورد</h3>
            <input type="date" value={retForm.return_date} onChange={(e) => setRetForm({ ...retForm, return_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <select value={retForm.supplier_id} onChange={(e) => setRetForm({ ...retForm, supplier_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
            <select
              value={retForm.item_code}
              onChange={(e) => {
                const it = items.find((x) => x.item_code === e.target.value);
                setRetForm({ ...retForm, item_code: e.target.value, unit_price: it?.cost_price || 0 });
              }}
              className="w-full gold-input rounded-xl px-3 py-2 text-xs"
            >
              {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="1" value={retForm.quantity} onChange={(e) => setRetForm({ ...retForm, quantity: Number(e.target.value) })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <input type="number" value={retForm.unit_price} onChange={(e) => setRetForm({ ...retForm, unit_price: Number(e.target.value) })} className="gold-input rounded-xl px-3 py-2 text-xs" />
            </div>
            <input placeholder="سبب الرد" value={retForm.reason} onChange={(e) => setRetForm({ ...retForm, reason: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ إشعار رد المشتريات</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل مردودات المشتريات</h3>
            {returns.length === 0 ? (
              <p className="text-xs text-[#A8A08C] py-8 text-center">لا توجد مردودات مشتريات مسجلة.</p>
            ) : (
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">رقم الإشعار</th>
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">المورد</th>
                    <th className="py-2 px-2">القيمة</th>
                    <th className="py-2 px-2">القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                  {returns.map((r) => (
                    <tr key={r.return_no}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{r.return_no}</td>
                      <td className="py-2 px-2">{r.return_date}</td>
                      <td className="py-2 px-2 font-bold">{r.supplier_name}</td>
                      <td className="py-2 px-2 text-amber-300">{fmtMoney(r.total_amount, currency)}</td>
                      <td className="py-2 px-2 font-mono text-[#B5AD99]">{r.journal_entry_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. سداد لمورد */}
      {tab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/supplier-payments', {
                  method: 'POST',
                  body: JSON.stringify(payForm),
                });
                setMsg({ type: 'ok', text: `${res.message} — الرصيد المتبقي للمورد: ${fmtMoney(res.new_supplier_balance, currency)}` });
                loadData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">شاشة سداد مستحقات لمورد</h3>
            <select value={payForm.supplier_id} onChange={(e) => setPayForm({ ...payForm, supplier_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name} (المستحق: {fmtMoney(s.net_balance, currency)})</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={payForm.tx_date} onChange={(e) => setPayForm({ ...payForm, tx_date: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs">
                <option value="نقدي">نقدي</option>
                <option value="شيك">شيك بنكي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
              </select>
            </div>
            {payForm.payment_method !== 'نقدي' && (
              <select value={payForm.bank_account_number} onChange={(e) => setPayForm({ ...payForm, bank_account_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                {banks.map((b) => <option key={b.bank_account_number} value={b.bank_account_number}>{b.bank_name}</option>)}
              </select>
            )}
            <input type="number" min="1" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="ملاحظات السداد" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">اعتماد السداد للمورد</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">يومية المدفوعات للموردين</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم المستند</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">المورد</th>
                  <th className="py-2 px-2">الطريقة</th>
                  <th className="py-2 px-2">المبلغ المسدد</th>
                  <th className="py-2 px-2">القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{p.doc_no}</td>
                    <td className="py-2.5 px-2">{p.tx_date}</td>
                    <td className="py-2.5 px-2 font-bold">{p.supplier_name}</td>
                    <td className="py-2.5 px-2">{p.payment_method}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(p.debit, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{p.journal_entry_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
