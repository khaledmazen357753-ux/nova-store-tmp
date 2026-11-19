import React, { useEffect, useState } from 'react';
import { PackagePlus, PackageMinus, FileSearch } from 'lucide-react';
import { apiFetch, fmtMoney, fmtNum, todayIso } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type InvTab = 'card' | 'addition' | 'issue';

export const InventoryModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<InvTab>('card');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState('ITM-102');
  const [cardData, setCardData] = useState<any>(null);
  const [additions, setAdditions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  const [addForm, setAddForm] = useState({
    addition_date: todayIso(),
    warehouse_name: 'المخزن الرئيسي',
    item_code: 'ITM-102',
    quantity: 5,
    unit_cost: 12000,
    notes: 'إذن إضافة أصناف واردة للمخزن',
  });

  const [issForm, setIssForm] = useState({
    issue_date: todayIso(),
    warehouse_name: 'المخزن الرئيسي',
    dept_code: 'DEPT-SLS',
    item_code: 'ITM-106',
    quantity: 2,
    notes: 'صرف مستلزمات تشغيل للقسم',
  });

  const loadBase = async () => {
    setLoading(true);
    try {
      const [itRes, dRes, addRes, issRes] = await Promise.all([
        apiFetch('/api/master/items'),
        apiFetch('/api/master/departments'),
        apiFetch('/api/transactions/stock-additions'),
        apiFetch('/api/transactions/stock-issues'),
      ]);
      setItems(itRes.items || []);
      setDepartments(dRes.departments || []);
      setAdditions(addRes.additions || []);
      setIssues(issRes.issues || []);
    } finally {
      setLoading(false);
    }
  };

  const loadItemCard = async (code: string) => {
    const res = await apiFetch(`/api/reports/inventory?type=item-card&item_code=${encodeURIComponent(code)}`);
    setCardData(res);
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (selectedCode) loadItemCard(selectedCode);
  }, [selectedCode]);

  if (loading) return <PlusSpinner label="جارٍ تحميل أذون المخازن وبطاقات حركة الأصناف..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'card', label: 'بطاقة الصنف اللحظية (وارد ومنصرف)', icon: <FileSearch className="w-4 h-4" /> },
          { id: 'addition', label: 'إذن إضافة أصناف للمخزن', icon: <PackagePlus className="w-4 h-4" /> },
          { id: 'issue', label: 'إذن صرف أصناف من المخزن', icon: <PackageMinus className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as InvTab); setMsg(null); }}
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

      {/* 1. شاشة بطاقة الصنف للاستعلام عن الرصيد اللحظي */}
      {tab === 'card' && (
        <div className="space-y-5">
          <div className="royal-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold gold-gradient-text">بطاقة حركة الصنف والرصيد اللحظي</h3>
              <p className="text-xs text-[#A8A08C]">اختر الصنف لاستعراض كافة حركات الوارد والمنصرف ومقارنة الرصيد بحد الطلب ومخزون الأمان</p>
            </div>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="gold-input rounded-xl px-4 py-2.5 text-xs font-bold min-w-[260px]"
            >
              {items.map((it) => (
                <option key={it.item_code} value={it.item_code}>
                  {it.item_code} — {it.item_name} (الرصيد: {fmtNum(it.current_balance)})
                </option>
              ))}
            </select>
          </div>

          {cardData?.item && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 tabular-nums">
                <div className="royal-card rounded-xl p-3.5">
                  <div className="text-[11px] text-[#A8A08C]">الرصيد الفعلي بالمخزن</div>
                  <div className="text-lg font-extrabold text-[#FCE79C] mt-1">
                    {fmtNum(cardData.item.current_balance)} {cardData.item.unit_of_measure}
                  </div>
                </div>
                <div className="royal-card rounded-xl p-3.5">
                  <div className="text-[11px] text-[#A8A08C]">حد إعادة الطلب (ROP)</div>
                  <div className="text-lg font-bold text-amber-300 mt-1">{fmtNum(cardData.item.reorder_point)}</div>
                </div>
                <div className="royal-card rounded-xl p-3.5">
                  <div className="text-[11px] text-[#A8A08C]">معدل مخزون الأمان</div>
                  <div className="text-lg font-bold text-[#F5EFE0] mt-1">{fmtNum(cardData.item.safety_stock)}</div>
                </div>
                <div className="royal-card rounded-xl p-3.5">
                  <div className="text-[11px] text-[#A8A08C]">الكمية الاقتصادية (EOQ)</div>
                  <div className="text-lg font-bold text-emerald-300 mt-1">{fmtNum(cardData.item.eoq)}</div>
                </div>
                <div className="royal-card rounded-xl p-3.5">
                  <div className="text-[11px] text-[#A8A08C]">قيمة المخزون بالتكلفة</div>
                  <div className="text-lg font-bold text-emerald-300 mt-1">
                    {fmtMoney(cardData.item.current_balance * cardData.item.cost_price, currency)}
                  </div>
                </div>
              </div>

              <div className="royal-card rounded-2xl p-5 overflow-x-auto">
                <h4 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل حركات الوارد والمنصرف للصنف ({cardData.movements.length} حركة)</h4>
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                      <th className="py-2 px-2">التاريخ</th>
                      <th className="py-2 px-2">نوع الحركة</th>
                      <th className="py-2 px-2">رقم المستند</th>
                      <th className="py-2 px-2">كمية الوارد (+)</th>
                      <th className="py-2 px-2">كمية المنصرف (-)</th>
                      <th className="py-2 px-2">سعر الوحدة</th>
                      <th className="py-2 px-2">الرصيد بعد الحركة</th>
                      <th className="py-2 px-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                    {cardData.movements.map((m: any) => (
                      <tr key={m.id}>
                        <td className="py-2.5 px-2">{m.movement_date}</td>
                        <td className="py-2.5 px-2 font-semibold">{m.movement_type}</td>
                        <td className="py-2.5 px-2 font-mono text-[#E5C158]">{m.doc_no}</td>
                        <td className="py-2.5 px-2 text-emerald-300 font-bold">{m.qty_in > 0 ? `+${fmtNum(m.qty_in)}` : '—'}</td>
                        <td className="py-2.5 px-2 text-red-300 font-bold">{m.qty_out > 0 ? `-${fmtNum(m.qty_out)}` : '—'}</td>
                        <td className="py-2.5 px-2">{fmtMoney(m.unit_price, currency)}</td>
                        <td className="py-2.5 px-2 font-extrabold text-[#FCE79C]">{fmtNum(m.balance_after)}</td>
                        <td className="py-2.5 px-2 text-[#A8A08C]">{m.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. إذن إضافة أصناف */}
      {tab === 'addition' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/stock-additions', {
                  method: 'POST',
                  body: JSON.stringify({
                    addition_date: addForm.addition_date,
                    warehouse_name: addForm.warehouse_name,
                    notes: addForm.notes,
                    items: [{ item_code: addForm.item_code, quantity: addForm.quantity, unit_cost: addForm.unit_cost }],
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} (${res.addition_no})` });
                await loadBase();
                await loadItemCard(addForm.item_code);
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">تسجيل إذن إضافة أصناف للمخزن</h3>
            <input type="date" value={addForm.addition_date} onChange={(e) => setAddForm({ ...addForm, addition_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <input placeholder="اسم المخزن" value={addForm.warehouse_name} onChange={(e) => setAddForm({ ...addForm, warehouse_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <select
              value={addForm.item_code}
              onChange={(e) => {
                const it = items.find((x) => x.item_code === e.target.value);
                setAddForm({ ...addForm, item_code: e.target.value, unit_cost: it?.cost_price || 0 });
              }}
              className="w-full gold-input rounded-xl px-3 py-2 text-xs"
            >
              {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">الكمية المضافة</label>
                <input type="number" min="1" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">تكلفة الوحدة</label>
                <input type="number" value={addForm.unit_cost} onChange={(e) => setAddForm({ ...addForm, unit_cost: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <input placeholder="ملاحظات الإضافة" value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">اعتماد إذن الإضافة للمخزن</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل أذون الإضافة للمخزن</h3>
            {additions.length === 0 ? (
              <p className="text-xs text-[#A8A08C] py-8 text-center">لا توجد أذون إضافة يدوية مسجلة بعد.</p>
            ) : (
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">رقم الإذن</th>
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">المخزن</th>
                    <th className="py-2 px-2">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {additions.map((a) => (
                    <tr key={a.addition_no}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{a.addition_no}</td>
                      <td className="py-2 px-2">{a.addition_date}</td>
                      <td className="py-2 px-2">{a.warehouse_name}</td>
                      <td className="py-2 px-2 text-[#B5AD99]">{a.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. إذن صرف أصناف */}
      {tab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/stock-issues', {
                  method: 'POST',
                  body: JSON.stringify({
                    issue_date: issForm.issue_date,
                    warehouse_name: issForm.warehouse_name,
                    dept_code: issForm.dept_code,
                    notes: issForm.notes,
                    items: [{ item_code: issForm.item_code, quantity: issForm.quantity }],
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} (${res.issue_no})` });
                await loadBase();
                await loadItemCard(issForm.item_code);
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">تسجيل إذن صرف أصناف من المخزن</h3>
            <input type="date" value={issForm.issue_date} onChange={(e) => setIssForm({ ...issForm, issue_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <select value={issForm.dept_code} onChange={(e) => setIssForm({ ...issForm, dept_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {departments.map((d) => <option key={d.dept_code} value={d.dept_code}>صرف لصالح: {d.dept_name}</option>)}
            </select>
            <select value={issForm.item_code} onChange={(e) => setIssForm({ ...issForm, item_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {items.map((it) => <option key={it.item_code} value={it.item_code}>{it.item_code} - {it.item_name} (متاح: {fmtNum(it.current_balance)})</option>)}
            </select>
            <div>
              <label className="text-[11px] text-[#B5AD99]">الكمية المنصرفة</label>
              <input type="number" min="1" value={issForm.quantity} onChange={(e) => setIssForm({ ...issForm, quantity: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
            </div>
            <input placeholder="بيان الصرف" value={issForm.notes} onChange={(e) => setIssForm({ ...issForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">اعتماد إذن الصرف من المخزن</button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل أذون الصرف من المخزن</h3>
            {issues.length === 0 ? (
              <p className="text-xs text-[#A8A08C] py-8 text-center">لا توجد أذون صرف مخزنية يدوية بعد.</p>
            ) : (
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">رقم الإذن</th>
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">القسم المستلم</th>
                    <th className="py-2 px-2">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {issues.map((iss) => (
                    <tr key={iss.issue_no}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{iss.issue_no}</td>
                      <td className="py-2 px-2">{iss.issue_date}</td>
                      <td className="py-2 px-2">{iss.dept_name || '—'}</td>
                      <td className="py-2 px-2 text-[#B5AD99]">{iss.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
