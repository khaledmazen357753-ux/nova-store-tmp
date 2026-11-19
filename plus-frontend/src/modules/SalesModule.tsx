import React, { useEffect, useState } from 'react';
import { Receipt, RotateCcw, HandCoins, Plus, Trash2, Printer } from 'lucide-react';
import { apiFetch, fmtMoney, fmtNum, todayIso } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type SalesTab = 'invoice' | 'returns' | 'collections';

export const SalesModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<SalesTab>('invoice');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  // نموذج فاتورة البيع
  const [invHeader, setInvHeader] = useState({
    invoice_date: todayIso(),
    customer_id: 'CUST-001',
    employee_code: 'EMP-002',
    payment_method: 'آجل',
    bank_account_number: '',
    notes: '',
  });
  const [invLines, setInvLines] = useState([
    { item_code: 'ITM-104', quantity: 2, unit_price: 6200, discount_percent: 0 },
  ]);

  // نموذج مردودات المبيعات
  const [retForm, setRetForm] = useState({
    return_date: todayIso(),
    customer_id: 'CUST-001',
    invoice_no: '',
    refund_method: 'خصم من الحساب',
    item_code: 'ITM-104',
    quantity: 1,
    unit_price: 6200,
    reason: 'رد جزء من البضاعة لمخالفة المواصفات المطلوبة',
  });

  // نموذج التحصيل النقدي / بشيك من عميل
  const [collForm, setCollForm] = useState({
    customer_id: 'CUST-001',
    tx_date: todayIso(),
    amount: 15000,
    collection_method: 'نقدي',
    bank_account_number: '',
    check_number: '',
    notes: 'دفعة تحت الحساب',
  });

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const [cRes, eRes, iRes, bRes, invRes, retRes, colRes] = await Promise.all([
        apiFetch('/api/master/customers'),
        apiFetch('/api/master/employees'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/banks'),
        apiFetch('/api/transactions/sales-invoices'),
        apiFetch('/api/transactions/sales-returns'),
        apiFetch('/api/transactions/customer-collections'),
      ]);
      setCustomers(cRes.customers || []);
      setEmployees(eRes.employees || []);
      setItems(iRes.items || []);
      setBanks(bRes.banks || []);
      setInvoices(invRes.invoices || []);
      setReturns(retRes.returns || []);
      setCollections(colRes.collections || []);
      if (bRes.banks?.length) {
        setInvHeader((p) => ({ ...p, bank_account_number: p.bank_account_number || bRes.banks[0].bank_account_number }));
        setCollForm((p) => ({ ...p, bank_account_number: p.bank_account_number || bRes.banks[0].bank_account_number }));
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  const selectedCustomer = customers.find((c) => c.customer_id === invHeader.customer_id);

  // حسابات جدول الفاتورة الفرعي تلقائياً: (عدد الوحدات × سعر الوحدة) - قيمة الخصم
  const computedLines = invLines.map((l) => {
    const gross = l.quantity * l.unit_price;
    const discVal = gross * ((l.discount_percent || 0) / 100);
    const net = gross - discVal;
    return { ...l, gross, discVal, net };
  });
  const invGrossTotal = computedLines.reduce((s, l) => s + l.gross, 0);
  const invDiscTotal = computedLines.reduce((s, l) => s + l.discVal, 0);
  const invNetTotal = computedLines.reduce((s, l) => s + l.net, 0);

  if (loading) return <PlusSpinner label="جارٍ تحميل وحدة المبيعات وحسابات العملاء..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 no-print">
        {[
          { id: 'invoice', label: 'فاتورة بيع (رأس + جدول أصناف فرعي)', icon: <Receipt className="w-4 h-4" /> },
          { id: 'returns', label: 'إشعار رد مبيعات', icon: <RotateCcw className="w-4 h-4" /> },
          { id: 'collections', label: 'تحصيل نقدي / بنكي من عميل', icon: <HandCoins className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as SalesTab); setMsg(null); }}
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

      {/* 1. فاتورة البيع */}
      {tab === 'invoice' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/sales-invoices', {
                  method: 'POST',
                  body: JSON.stringify({ ...invHeader, items: invLines }),
                });
                const alertNote = res.reorder_alerts?.length
                  ? ` | تنبيه مخزني: وصل الصنف (${res.reorder_alerts.map((a: any) => a.item_name).join('، ')}) إلى حد إعادة الطلب!`
                  : '';
                setMsg({ type: 'ok', text: `${res.message} (${res.invoice_no})${alertNote}` });
                loadSalesData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="royal-card rounded-2xl p-5 md:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3">
              <div>
                <h3 className="text-base font-bold gold-gradient-text">إصدار فاتورة بيع ضريبية متكاملة</h3>
                <p className="text-xs text-[#A8A08C]">تحسب الصافي تلقائياً بعد الخصم وتُحدث رصيد المخزن وحساب العميل واليومية العامة دون تكرار إدخال</p>
              </div>
              {selectedCustomer && (
                <div className="px-3.5 py-2 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/30 text-xs tabular-nums">
                  <span className="text-[#B5AD99]">رصيد العميل الحالي: </span>
                  <strong className="text-amber-300">{fmtMoney(selectedCustomer.net_balance, currency)}</strong>
                  <span className="mx-2 text-[#D4AF37]/40">|</span>
                  <span className="text-[#B5AD99]">الائتمان المتاح: </span>
                  <strong className="text-emerald-300">{fmtMoney(selectedCustomer.available_credit, currency)}</strong>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-[#C7BFA9]">تاريخ الفاتورة</label>
                <input type="date" value={invHeader.invoice_date} onChange={(e) => setInvHeader({ ...invHeader, invoice_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" required />
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">العميل</label>
                <select value={invHeader.customer_id} onChange={(e) => setInvHeader({ ...invHeader, customer_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">مندوب البيع / الموظف</label>
                <select value={invHeader.employee_code} onChange={(e) => setInvHeader({ ...invHeader, employee_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  {employees.map((emp) => <option key={emp.employee_code} value={emp.employee_code}>{emp.employee_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#C7BFA9]">طريقة السداد</label>
                <select value={invHeader.payment_method} onChange={(e) => setInvHeader({ ...invHeader, payment_method: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  <option value="آجل">بيع آجل (على حساب العميل)</option>
                  <option value="نقدي">نقدي بالخزينة</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                </select>
              </div>
            </div>

            {/* الجدول الفرعي للأصناف */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">الصنف (المتاح بالمخزن)</th>
                    <th className="py-2 px-2 w-24">عدد الوحدات</th>
                    <th className="py-2 px-2 w-32">سعر الوحدة</th>
                    <th className="py-2 px-2 w-24">نسبة الخصم %</th>
                    <th className="py-2 px-2 w-32">قيمة الخصم</th>
                    <th className="py-2 px-2 w-36">الصافي بعد الخصم</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                  {computedLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2">
                        <select
                          value={line.item_code}
                          onChange={(e) => {
                            const found = items.find((i) => i.item_code === e.target.value);
                            const copy = [...invLines];
                            copy[idx] = { ...copy[idx], item_code: e.target.value, unit_price: found?.unit_price || 0 };
                            setInvLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        >
                          {items.map((it) => (
                            <option key={it.item_code} value={it.item_code}>
                              {it.item_code} - {it.item_name} (متاح: {fmtNum(it.current_balance)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const copy = [...invLines];
                            copy[idx].quantity = Number(e.target.value || 1);
                            setInvLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={line.unit_price}
                          onChange={(e) => {
                            const copy = [...invLines];
                            copy[idx].unit_price = Number(e.target.value || 0);
                            setInvLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discount_percent}
                          onChange={(e) => {
                            const copy = [...invLines];
                            copy[idx].discount_percent = Number(e.target.value || 0);
                            setInvLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-amber-300">{fmtMoney(line.discVal, currency)}</td>
                      <td className="py-2 px-2 font-bold text-emerald-300">{fmtMoney(line.net, currency)}</td>
                      <td className="py-2 px-2">
                        {invLines.length > 1 && (
                          <button type="button" onClick={() => setInvLines(invLines.filter((_, i) => i !== idx))} className="text-red-400 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#D4AF37]/20">
              <button
                type="button"
                onClick={() => {
                  const first = items[0];
                  setInvLines([...invLines, { item_code: first?.item_code || 'ITM-101', quantity: 1, unit_price: first?.unit_price || 0, discount_percent: 0 }]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs bg-[#14141B] border border-[#D4AF37]/35 text-[#E5C158] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> إضافة صنف للفاتورة
              </button>

              <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
                <span>الإجمالي قبل الخصم: <strong>{fmtMoney(invGrossTotal, currency)}</strong></span>
                <span className="text-amber-300">قيمة الخصم: <strong>{fmtMoney(invDiscTotal, currency)}</strong></span>
                <span className="text-base font-extrabold text-emerald-300">صافي الفاتورة: {fmtMoney(invNetTotal, currency)}</span>
                <button type="submit" className="gold-metallic-btn px-6 py-2.5 rounded-xl text-xs cursor-pointer">
                  اعتماد وترحيل فاتورة البيع
                </button>
              </div>
            </div>
          </form>

          {/* سجل فواتير البيع */}
          <div className="royal-card rounded-2xl p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#FAF5E8]">سجل فواتير البيع الصادرة ({invoices.length})</h3>
              <button onClick={() => window.print()} className="no-print text-xs px-3 py-1.5 rounded-lg border border-[#D4AF37]/35 text-[#E5C158] flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> طباعة السجل
              </button>
            </div>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم الفاتورة</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">العميل</th>
                  <th className="py-2 px-2">البائع</th>
                  <th className="py-2 px-2">السداد</th>
                  <th className="py-2 px-2">الإجمالي</th>
                  <th className="py-2 px-2">الخصم</th>
                  <th className="py-2 px-2">الصافي</th>
                  <th className="py-2 px-2">رقم القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {invoices.map((inv) => (
                  <tr key={inv.invoice_no}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{inv.invoice_no}</td>
                    <td className="py-2.5 px-2">{inv.invoice_date}</td>
                    <td className="py-2.5 px-2 font-bold">{inv.customer_name}</td>
                    <td className="py-2.5 px-2 text-[#B5AD99]">{inv.employee_name}</td>
                    <td className="py-2.5 px-2">{inv.payment_method}</td>
                    <td className="py-2.5 px-2">{fmtMoney(inv.gross_total, currency)}</td>
                    <td className="py-2.5 px-2 text-amber-300">{fmtMoney(inv.discount_total, currency)}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(inv.net_total, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{inv.journal_entry_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. إشعار رد مبيعات */}
      {tab === 'returns' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/sales-returns', {
                  method: 'POST',
                  body: JSON.stringify({
                    return_date: retForm.return_date,
                    customer_id: retForm.customer_id,
                    invoice_no: retForm.invoice_no || null,
                    refund_method: retForm.refund_method,
                    reason: retForm.reason,
                    items: [{ item_code: retForm.item_code, quantity: retForm.quantity, unit_price: retForm.unit_price }],
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} — إشعار رقم ${res.return_no}` });
                loadSalesData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إصدار إشعار رد بضاعة مباعة (دائن للعميل)</h3>
            <input type="date" value={retForm.return_date} onChange={(e) => setRetForm({ ...retForm, return_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <select value={retForm.customer_id} onChange={(e) => setRetForm({ ...retForm, customer_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>)}
            </select>
            <select
              value={retForm.item_code}
              onChange={(e) => {
                const found = items.find((i) => i.item_code === e.target.value);
                setRetForm({ ...retForm, item_code: e.target.value, unit_price: found?.unit_price || 0 });
              }}
              className="w-full gold-input rounded-xl px-3 py-2 text-xs"
            >
              {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">الكمية المرتجعة</label>
                <input type="number" min="1" value={retForm.quantity} onChange={(e) => setRetForm({ ...retForm, quantity: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">سعر الوحدة</label>
                <input type="number" value={retForm.unit_price} onChange={(e) => setRetForm({ ...retForm, unit_price: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <select value={retForm.refund_method} onChange={(e) => setRetForm({ ...retForm, refund_method: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              <option value="خصم من الحساب">خصم من مديونية حساب العميل</option>
              <option value="نقدي">رد نقدي من الخزينة</option>
            </select>
            <input placeholder="سبب رد البضاعة" value={retForm.reason} onChange={(e) => setRetForm({ ...retForm, reason: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ إشعار رد المبيعات</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل إشعارات مردودات المبيعات</h3>
            {returns.length === 0 ? (
              <p className="text-xs text-[#A8A08C] py-8 text-center">لا توجد مردودات مبيعات مسجلة حتى الآن.</p>
            ) : (
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">رقم الإشعار</th>
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">العميل</th>
                    <th className="py-2 px-2">طريقة التسوية</th>
                    <th className="py-2 px-2">القيمة</th>
                    <th className="py-2 px-2">القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                  {returns.map((r) => (
                    <tr key={r.return_no}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{r.return_no}</td>
                      <td className="py-2 px-2">{r.return_date}</td>
                      <td className="py-2 px-2 font-bold">{r.customer_name}</td>
                      <td className="py-2 px-2">{r.refund_method}</td>
                      <td className="py-2 px-2 text-amber-300 font-bold">{fmtMoney(r.total_amount, currency)}</td>
                      <td className="py-2 px-2 font-mono text-[#B5AD99]">{r.journal_entry_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. تحصيل نقدي / بشيك من عميل */}
      {tab === 'collections' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/customer-collections', {
                  method: 'POST',
                  body: JSON.stringify(collForm),
                });
                setMsg({ type: 'ok', text: `${res.message} — الرصيد الجديد للعميل: ${fmtMoney(res.new_customer_balance, currency)}` });
                loadSalesData();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">شاشة تحصيل نقدي أو بشيك من عميل</h3>
            <select value={collForm.customer_id} onChange={(e) => setCollForm({ ...collForm, customer_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name} (الرصيد: {fmtMoney(c.net_balance, currency)})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={collForm.tx_date} onChange={(e) => setCollForm({ ...collForm, tx_date: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <select value={collForm.collection_method} onChange={(e) => setCollForm({ ...collForm, collection_method: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs">
                <option value="نقدي">تحصيل نقدي</option>
                <option value="شيك">شيك بنكي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
              </select>
            </div>
            {collForm.collection_method !== 'نقدي' && (
              <div className="space-y-2">
                <select value={collForm.bank_account_number} onChange={(e) => setCollForm({ ...collForm, bank_account_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                  {banks.map((b) => <option key={b.bank_account_number} value={b.bank_account_number}>{b.bank_name}</option>)}
                </select>
                {collForm.collection_method === 'شيك' && (
                  <input placeholder="رقم الشيك" value={collForm.check_number} onChange={(e) => setCollForm({ ...collForm, check_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
                )}
              </div>
            )}
            <div>
              <label className="text-[11px] text-[#B5AD99]">المبلغ المحصل ({currency})</label>
              <input type="number" min="1" value={collForm.amount} onChange={(e) => setCollForm({ ...collForm, amount: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" required />
            </div>
            <input placeholder="بيان وملاحظات التحصيل" value={collForm.notes} onChange={(e) => setCollForm({ ...collForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">تسجيل التحصيل وتحديث رصيد العميل</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل المتحصلات من العملاء</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم المستند</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">العميل</th>
                  <th className="py-2 px-2">طريقة التحصيل</th>
                  <th className="py-2 px-2">المبلغ الدائن</th>
                  <th className="py-2 px-2">رقم القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {collections.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{c.doc_no}</td>
                    <td className="py-2.5 px-2">{c.tx_date}</td>
                    <td className="py-2.5 px-2 font-bold">{c.customer_name}</td>
                    <td className="py-2.5 px-2">{c.collection_method}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(c.credit, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{c.journal_entry_number}</td>
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
