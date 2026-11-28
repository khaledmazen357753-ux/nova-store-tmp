import React, { useEffect, useMemo, useState } from 'react';
import {
  PackagePlus,
  PackageMinus,
  Boxes,
  AlertTriangle,
  Search,
  TrendingDown,
  Activity,
  Warehouse,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Money, Num, Badge, Table, Spinner, Notice, Button, Input, Select, Field, Tabs, TotalRow, today } from './ui';

/**
 * المخزون: الأرصدة، بطاقة كل صنف، وأذون الإضافة والصرف.
 *
 * قاعدة هذا الموقع: رصيد الصنف ليس رقماً يُكتب — هو مجموع حركاته. لذلك
 * توجد بطاقة صنف لكل صنف، وتقرير مطابقة يكشف أي فرق بين الرصيد والحركة
 * فوراً. الصفحة تعرض الفرق في الأعلى بدل أن تخفيه في تقرير منفصل.
 */

type Tab = 'balances' | 'item-card' | 'additions' | 'issues';

export const Inventory: React.FC<{ currency: string; canWrite: boolean; onCreated?: () => void }> = ({
  currency,
  canWrite,
  onCreated,
}) => {
  const [tab, setTab] = useState<Tab>('balances');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [additions, setAdditions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [recon, setRecon] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [selected, setSelected] = useState<string>('');
  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const [addForm, setAddForm] = useState({
    addition_date: today(),
    warehouse_name: 'المخزن الرئيسي — المنيا',
    supplier_id: '',
    reference_doc: '',
    notes: '',
    item_code: '',
    quantity: 1,
    unit_cost: 0,
  });

  const [issueForm, setIssueForm] = useState({
    issue_date: today(),
    warehouse_name: 'المخزن الرئيسي — المنيا',
    dept_code: 'DEPT-PUR',
    reference_doc: '',
    notes: '',
    item_code: '',
    quantity: 1,
  });

  const load = async () => {
    try {
      const [it, gr, sp, add, iss, rec] = await Promise.all([
        apiFetch('/api/master/items'),
        apiFetch('/api/master/item-groups'),
        apiFetch('/api/master/suppliers'),
        apiFetch('/api/transactions/stock-additions'),
        apiFetch('/api/transactions/stock-issues'),
        apiFetch('/api/reports/inventory?type=stock-reconciliation'),
      ]);
      setItems(it.items || []);
      setGroups(gr.itemGroups || []);
      setSuppliers(sp.suppliers || []);
      setAdditions(add.additions || []);
      setIssues(iss.issues || []);
      setRecon(rec.rows || []);
      const first = it.items?.[0];
      setAddForm((f) => ({
        ...f,
        item_code: f.item_code || first?.item_code || '',
        unit_cost: f.unit_cost || Number(first?.cost_price || 0),
        supplier_id: f.supplier_id || sp.suppliers?.[0]?.supplier_id || '',
      }));
      setIssueForm((f) => ({ ...f, item_code: f.item_code || first?.item_code || '' }));
      setSelected((s) => s || first?.item_code || '');
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCard = async (code: string) => {
    setSelected(code);
    setTab('item-card');
    setCardLoading(true);
    setCard(null);
    try {
      setCard(await apiFetch(`/api/reports/inventory?type=item-card&item_code=${code}`));
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setCardLoading(false);
    }
  };

  const submitAddition = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/stock-additions', {
        method: 'POST',
        body: JSON.stringify({
          addition_date: addForm.addition_date,
          warehouse_name: addForm.warehouse_name,
          supplier_id: addForm.supplier_id || null,
          reference_doc: addForm.reference_doc,
          notes: addForm.notes,
          items: [{ item_code: addForm.item_code, quantity: addForm.quantity, unit_cost: addForm.unit_cost }],
        }),
      });
      setMsg({ tone: 'ok', text: `${res.message} — الإذن ${res.addition_no} بقيمة ${Number(res.total_cost).toLocaleString('en-US')} ${currency}` });
      setAddForm((f) => ({ ...f, notes: '', reference_doc: '', quantity: 1 }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/stock-issues', {
        method: 'POST',
        body: JSON.stringify({
          issue_date: issueForm.issue_date,
          warehouse_name: issueForm.warehouse_name,
          dept_code: issueForm.dept_code,
          reference_doc: issueForm.reference_doc,
          notes: issueForm.notes,
          items: [{ item_code: issueForm.item_code, quantity: issueForm.quantity }],
        }),
      });
      setMsg({ tone: 'ok', text: `${res.message} — الإذن ${res.issue_no} بقيمة ${Number(res.total_cost).toLocaleString('en-US')} ${currency}` });
      setIssueForm((f) => ({ ...f, notes: '', reference_doc: '', quantity: 1 }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const okGroup = !groupFilter || i.group_code === groupFilter;
      const okQuery =
        !q || i.item_name.toLowerCase().includes(q) || i.item_code.toLowerCase().includes(q);
      return okGroup && okQuery;
    });
  }, [items, query, groupFilter]);

  const stats = useMemo(() => {
    const totalCost = items.reduce((s, i) => s + Number(i.current_balance) * Number(i.cost_price), 0);
    const belowReorder = items.filter((i) => Number(i.current_balance) <= Number(i.reorder_point));
    const mismatched = recon.filter((r) => !r.is_matched);
    return { totalCost, belowReorder, mismatched };
  }, [items, recon]);

  if (loading) return <Spinner label="جارٍ تحميل المخزون وبطاقات الأصناف…" />;

  return (
    <div className="space-y-4">
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282] flex items-center gap-1.5">
            <Boxes className="w-3 h-3 text-[#D4AF37]" /> قيمة المخزون بالتكلفة
          </div>
          <div className="text-lg font-extrabold text-[#E5C158] mt-1.5">
            <Money value={stats.totalCost} currency={currency} />
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282]">عدد الأصناف</div>
          <div className="text-lg font-extrabold text-[#F7F3E8] mt-1.5 tabular-nums" dir="ltr">
            {items.length}
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282] flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" /> تحت حد الطلب
          </div>
          <div className="text-lg font-extrabold text-red-300 mt-1.5 tabular-nums" dir="ltr">
            {stats.belowReorder.length}
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282] flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" /> مطابقة البطاقات
          </div>
          <div className={`text-lg font-extrabold mt-1.5 ${stats.mismatched.length ? 'text-red-300' : 'text-emerald-300'}`}>
            {stats.mismatched.length ? `${stats.mismatched.length} فرق` : 'مطابقة 100%'}
          </div>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'balances' as Tab, label: 'أرصدة المخزون', icon: <Boxes className="w-3.5 h-3.5" /> },
          { id: 'item-card' as Tab, label: 'بطاقة صنف', icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'additions' as Tab, label: 'أذون الإضافة', icon: <PackagePlus className="w-3.5 h-3.5" /> },
          { id: 'issues' as Tab, label: 'أذون الصرف', icon: <PackageMinus className="w-3.5 h-3.5" /> },
        ]}
      />

      {tab === 'balances' && (
        <Card
          title={`أرصدة الأصناف (${filtered.length})`}
          subtitle="اضغط على أي صنف لفتح بطاقته وحركاته"
          actions={
            <div className="flex flex-wrap gap-2">
              <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-44">
                <option value="">كل المجموعات</option>
                {groups.map((g) => (
                  <option key={g.group_code} value={g.group_code}>
                    {g.group_name}
                  </option>
                ))}
              </Select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8C8474] absolute right-3 top-1/2 -translate-y-1/2" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالصنف" className="pr-8 w-44" />
              </div>
            </div>
          }
        >
          <Table head={['الكود', 'الصنف', 'المجموعة', 'الرصيد', 'التكلفة', 'القيمة', 'حد الطلب', 'الحالة', '']} empty="لا أصناف">
            {filtered.map((i) => {
              const critical = Number(i.current_balance) <= Number(i.safety_stock);
              const low = Number(i.current_balance) <= Number(i.reorder_point);
              return (
                <tr key={i.item_code} className="hover:bg-[#D4AF37]/5 cursor-pointer" onClick={() => openCard(i.item_code)}>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {i.item_code}
                  </td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-[#F7F3E8] text-[11px]">{i.item_name}</div>
                    <div className="text-[10px] text-[#7C7565]">{i.unit_of_measure}</div>
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#A9A292]">{i.group_name}</td>
                  <td className={`py-2 px-2 font-extrabold ${critical ? 'text-red-300' : low ? 'text-amber-300' : 'text-[#F7F3E8]'}`}>
                    <Num value={i.current_balance} />
                  </td>
                  <td className="py-2 px-2">
                    <Num value={i.cost_price} />
                  </td>
                  <td className="py-2 px-2 font-bold text-[#E5C158]">
                    <Num value={i.stock_value} />
                  </td>
                  <td className="py-2 px-2">
                    <Num value={i.reorder_point} />
                  </td>
                  <td className="py-2 px-2">
                    <Badge tone={critical ? 'red' : low ? 'gold' : 'green'}>{i.stock_status}</Badge>
                  </td>
                  <td className="py-2 px-2 text-[#D4AF37]">←</td>
                </tr>
              );
            })}
          </Table>
          <TotalRow label="إجمالي قيمة المخزون">
            <Money value={stats.totalCost} currency={currency} />
          </TotalRow>
        </Card>
      )}

      {tab === 'item-card' && (
        <Card
          title="بطاقة صنف — كل حركة والرصيد بعدها"
          subtitle="الرصيد الأخير في البطاقة يجب أن يساوي رصيد الصنف في المخزن، وإلا ظهر التنبيه"
          actions={
            <Select value={selected} onChange={(e) => openCard(e.target.value)} className="w-64">
              {items.map((i) => (
                <option key={i.item_code} value={i.item_code}>
                  {i.item_name}
                </option>
              ))}
            </Select>
          }
        >
          {cardLoading ? (
            <Spinner label="جارٍ بناء بطاقة الصنف…" />
          ) : card ? (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px]">
                <Badge tone="gold" >{card.item.item_code}</Badge>
                <span className="text-[#F7F3E8] font-bold">{card.item.item_name}</span>
                <span className="text-[#8C8474]">
                  الرصيد: <b className="text-[#E5C158]">{Number(card.item.current_balance).toLocaleString('en-US')}</b> {card.item.unit_of_measure}
                </span>
                <span className="text-[#8C8474]">
                  التكلفة: <b className="text-[#F7F3E8]">{Number(card.item.cost_price).toLocaleString('en-US')}</b>
                </span>
                <span className="text-[#8C8474]">
                  حد الطلب: <b className="text-[#A9A292]">{Number(card.item.reorder_point).toLocaleString('en-US')}</b>
                </span>
              </div>
              <Table head={['التاريخ', 'نوع الحركة', 'المستند', 'وارد', 'منصرف', 'سعر الوحدة', 'الرصيد بعد', 'ملاحظات']} empty="لا حركات">
                {card.movements?.map((m: any) => (
                  <tr key={m.id}>
                    <td className="py-2 px-2 text-[10px]" dir="ltr">
                      {m.movement_date}
                    </td>
                    <td className="py-2 px-2">
                      <Badge tone={m.movement_type.includes('صرف') ? 'red' : m.movement_type.includes('افتتاحي') ? 'gray' : 'green'}>
                        {m.movement_type}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-[10px] text-[#A9A292]" dir="ltr">
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
                    <td className="py-2 px-2 text-[10px] text-[#7C7565] max-w-[220px] truncate">{m.notes}</td>
                  </tr>
                ))}
              </Table>
            </>
          ) : (
            <div className="text-[11px] text-[#7C7565]">اختر صنفاً لعرض بطاقته</div>
          )}
        </Card>
      )}

      {tab === 'additions' && (
        <>
          {canWrite ? (
            <Card
              title="إذن إضافة مخزني"
              subtitle="لاستلام بضاعة بلا فاتورة شراء (توريد داخلي/تسوية) — يُنشئ قيداً: المخزون مدين / إيرادات أخرى دائن"
            >
              <form onSubmit={submitAddition} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Field label="تاريخ الإذن">
                    <Input type="date" value={addForm.addition_date} onChange={(e) => setAddForm({ ...addForm, addition_date: e.target.value })} required />
                  </Field>
                  <Field label="المخزن">
                    <Input value={addForm.warehouse_name} onChange={(e) => setAddForm({ ...addForm, warehouse_name: e.target.value })} />
                  </Field>
                  <Field label="المورد (اختياري)">
                    <Select value={addForm.supplier_id} onChange={(e) => setAddForm({ ...addForm, supplier_id: e.target.value })}>
                      <option value="">— بدون مورد —</option>
                      {suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.supplier_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="المستند المرجعي">
                    <Input value={addForm.reference_doc} onChange={(e) => setAddForm({ ...addForm, reference_doc: e.target.value })} placeholder="أمر توريد / محضر جرد" />
                  </Field>
                  <Field label="الصنف">
                    <Select
                      value={addForm.item_code}
                      onChange={(e) => {
                        const found = items.find((x) => x.item_code === e.target.value);
                        setAddForm({ ...addForm, item_code: e.target.value, unit_cost: Number(found?.cost_price || 0) });
                      }}
                    >
                      {items.map((i) => (
                        <option key={i.item_code} value={i.item_code}>
                          {i.item_name} — رصيد {i.current_balance}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="الكمية">
                    <Input type="number" min="1" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value || 1) })} />
                  </Field>
                  <Field label="تكلفة الوحدة">
                    <Input type="number" min="0" value={addForm.unit_cost} onChange={(e) => setAddForm({ ...addForm, unit_cost: Number(e.target.value || 0) })} />
                  </Field>
                  <Field label="ملاحظات">
                    <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-emerald-300">
                    قيمة الإذن: <Money value={addForm.quantity * addForm.unit_cost} currency={currency} />
                  </span>
                  <Button type="submit" disabled={busy}>
                    <PackagePlus className="w-4 h-4" /> {busy ? 'جارٍ الحفظ…' : 'حفظ إذن الإضافة'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Notice tone="err">لا تملك صلاحية إنشاء أذون الإضافة.</Notice>
          )}

          <Card title={`أذون الإضافة (${additions.length})`}>
            <Table head={['الإذن', 'التاريخ', 'المخزن', 'المورد', 'المستند', 'الأصناف']} empty="لا أذون إضافة">
              {additions.map((a: any) => (
                <tr key={a.addition_no}>
                  <td className="py-2 px-2 text-[11px] font-bold" dir="ltr">
                    {a.addition_no}
                  </td>
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {a.addition_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Warehouse className="w-3 h-3 text-[#D4AF37]" /> {a.warehouse_name}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[11px]">{a.supplier_name || '—'}</td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {a.reference_doc || '—'}
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#A9A292]">
                    {a.items?.map((it: any) => `${it.item_name} × ${it.quantity}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === 'issues' && (
        <>
          {canWrite ? (
            <Card
              title="إذن صرف مخزني"
              subtitle="صرف مستلزمات لإدارة — يُنشئ قيداً: مصروفات مدين / المخزون دائن، ويمنع الصرف بأكثر من الرصيد"
            >
              <form onSubmit={submitIssue} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Field label="تاريخ الصرف">
                    <Input type="date" value={issueForm.issue_date} onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })} required />
                  </Field>
                  <Field label="المخزن">
                    <Input value={issueForm.warehouse_name} onChange={(e) => setIssueForm({ ...issueForm, warehouse_name: e.target.value })} />
                  </Field>
                  <Field label="الإدارة الطالبة">
                    <Select value={issueForm.dept_code} onChange={(e) => setIssueForm({ ...issueForm, dept_code: e.target.value })}>
                      <option value="DEPT-PUR">إدارة المشتريات والتوريدات</option>
                      <option value="DEPT-INV">إدارة المخازن والرقابة السلعية</option>
                      <option value="DEPT-FIN">الإدارة المالية</option>
                    </Select>
                  </Field>
                  <Field label="المستند المرجعي">
                    <Input value={issueForm.reference_doc} onChange={(e) => setIssueForm({ ...issueForm, reference_doc: e.target.value })} placeholder="طلب صرف رقم…" />
                  </Field>
                  <Field label="الصنف">
                    <Select value={issueForm.item_code} onChange={(e) => setIssueForm({ ...issueForm, item_code: e.target.value })}>
                      {items.map((i) => (
                        <option key={i.item_code} value={i.item_code}>
                          {i.item_name} — رصيد {i.current_balance}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="الكمية">
                    <Input type="number" min="1" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value || 1) })} />
                  </Field>
                  <Field label="ملاحظات" className="sm:col-span-2">
                    <Input value={issueForm.notes} onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })} />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#8C8474] flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" /> يُرفض الصرف إن كانت الكمية أكبر من الرصيد الحالي
                  </span>
                  <Button type="submit" disabled={busy}>
                    <PackageMinus className="w-4 h-4" /> {busy ? 'جارٍ الحفظ…' : 'حفظ إذن الصرف'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Notice tone="err">لا تملك صلاحية إنشاء أذون الصرف.</Notice>
          )}

          <Card title={`أذون الصرف (${issues.length})`}>
            <Table head={['الإذن', 'التاريخ', 'المخزن', 'المستند', 'الأصناف']} empty="لا أذون صرف">
              {issues.map((iss: any) => (
                <tr key={iss.issue_no}>
                  <td className="py-2 px-2 text-[11px] font-bold" dir="ltr">
                    {iss.issue_no}
                  </td>
                  <td className="py-2 px-2 text-[10px]" dir="ltr">
                    {iss.issue_date}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{iss.warehouse_name}</td>
                  <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                    {iss.reference_doc || '—'}
                  </td>
                  <td className="py-2 px-2 text-[10px] text-[#A9A292]">
                    {iss.items?.map((it: any) => `${it.item_name} × ${it.quantity}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};
