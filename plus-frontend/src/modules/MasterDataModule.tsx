import React, { useEffect, useState } from 'react';
import { Building2, Layers, Users, UserCheck, Truck, Package, Landmark, Plus, Save } from 'lucide-react';
import { apiFetch, fmtMoney, fmtNum } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type MasterTab = 'company' | 'departments' | 'employees' | 'customers' | 'suppliers' | 'items' | 'banks';

export const MasterDataModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<MasterTab>('items');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [company, setCompany] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemGroups, setItemGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // نماذج الإضافة
  const [deptForm, setDeptForm] = useState({ dept_code: '', dept_name: '', manager_name: '', description: '' });
  const [empForm, setEmpForm] = useState({
    employee_code: '', employee_name: '', job_title: '', dept_code: 'DEPT-FIN',
    specialization: '', qualification: '', birth_date: '1994-01-01', hire_date: '2026-01-01',
    marital_status: 'متزوج', basic_salary: 9500, housing_allowance: 1200, transport_allowance: 900, meal_allowance: 500, other_allowances: 0,
  });
  const [custForm, setCustForm] = useState({
    customer_id: '', customer_name: '', address: '', city: 'القاهرة', phone: '', email: '', credit_limit: 100000, opening_balance: 0,
  });
  const [suppForm, setSuppForm] = useState({
    supplier_id: '', supplier_name: '', address: '', city: 'القاهرة', phone: '', email: '', opening_balance: 0,
  });
  const [groupForm, setGroupForm] = useState({ group_code: '', group_name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    item_code: '', item_name: '', group_code: 'GRP-SRV', item_type: 'بضاعة تامة الصنع',
    unit_of_measure: 'وحدة', cost_price: 5000, unit_price: 7200, annual_demand: 180,
    safety_stock: 5, lead_time_days: 7, eoq: 20, current_balance: 0,
  });
  const [bankForm, setBankForm] = useState({
    bank_account_number: '', bank_name: '', branch: '', currency: 'ج.م', opening_balance: 0, gl_account_code: '1102',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cRes, dRes, eRes, cuRes, suRes, igRes, itRes, bRes, acRes] = await Promise.all([
        apiFetch('/api/master/company'),
        apiFetch('/api/master/departments'),
        apiFetch('/api/master/employees'),
        apiFetch('/api/master/customers'),
        apiFetch('/api/master/suppliers'),
        apiFetch('/api/master/item-groups'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/banks'),
        apiFetch('/api/master/accounts-tree'),
      ]);
      setCompany(cRes.company || {});
      setDepartments(dRes.departments || []);
      setEmployees(eRes.employees || []);
      setCustomers(cuRes.customers || []);
      setSuppliers(suRes.suppliers || []);
      setItemGroups(igRes.itemGroups || []);
      setItems(itRes.items || []);
      setBanks(bRes.banks || []);
      setAccounts(acRes.accounts || []);
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const tabs: { id: MasterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'items', label: 'مجموعات الأصناف والأصناف', icon: <Package className="w-4 h-4" /> },
    { id: 'customers', label: 'العملاء وحد الائتمان', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'suppliers', label: 'الموردون', icon: <Truck className="w-4 h-4" /> },
    { id: 'employees', label: 'العاملون والرواتب الأساسية', icon: <Users className="w-4 h-4" /> },
    { id: 'departments', label: 'الإدارات والأقسام', icon: <Layers className="w-4 h-4" /> },
    { id: 'banks', label: 'حسابات البنوك', icon: <Landmark className="w-4 h-4" /> },
    { id: 'company', label: 'بيانات المنشأة', icon: <Building2 className="w-4 h-4" /> },
  ];

  if (loading) return <PlusSpinner label="جارٍ تحميل الجداول الرئيسية (Master Files)..." />;

  return (
    <div className="space-y-5">
      {/* التبويبات الفرعية للبيانات الأساسية */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              tab === t.id
                ? 'gold-metallic-btn'
                : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25 hover:border-[#D4AF37]/60'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-sm border ${
            msg.type === 'ok'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/50 border-red-500/40 text-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* 1. الأصناف ومجموعات الأصناف */}
      {tab === 'items' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch('/api/master/item-groups', { method: 'POST', body: JSON.stringify(groupForm) });
                  flash('ok', 'تم حفظ مجموعة الأصناف بنجاح');
                  setGroupForm({ group_code: '', group_name: '', description: '' });
                  loadAll();
                } catch (err: any) {
                  flash('err', err.message);
                }
              }}
              className="royal-card rounded-2xl p-5 space-y-3"
            >
              <h3 className="text-sm font-bold gold-gradient-text">إضافة مجموعة أصناف رئيسية</h3>
              <input
                placeholder="كود المجموعة (مثال: GRP-ACC)"
                value={groupForm.group_code}
                onChange={(e) => setGroupForm({ ...groupForm, group_code: e.target.value })}
                className="w-full gold-input rounded-xl px-3 py-2 text-xs"
                required
              />
              <input
                placeholder="اسم مجموعة الأصناف"
                value={groupForm.group_name}
                onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                className="w-full gold-input rounded-xl px-3 py-2 text-xs"
                required
              />
              <input
                placeholder="وصف مختصر"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                className="w-full gold-input rounded-xl px-3 py-2 text-xs"
              />
              <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> حفظ المجموعة
              </button>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch('/api/master/items', { method: 'POST', body: JSON.stringify(itemForm) });
                  flash('ok', 'تمت إضافة الصنف وحساب نقطة إعادة الطلب تلقائياً');
                  setItemForm({ ...itemForm, item_code: '', item_name: '' });
                  loadAll();
                } catch (err: any) {
                  flash('err', err.message);
                }
              }}
              className="lg:col-span-2 royal-card rounded-2xl p-5 space-y-3"
            >
              <h3 className="text-sm font-bold gold-gradient-text">إضافة صنف جديد (جدول البيانات الأساسية للأصناف)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#B5AD99]">كود الصنف (PK)</label>
                  <input
                    value={itemForm.item_code}
                    onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                    placeholder="ITM-107"
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#B5AD99]">اسم الصنف</label>
                  <input
                    value={itemForm.item_name}
                    onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                    placeholder="اسم الصنف بالتفصيل"
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">مجموعة الصنف (FK)</label>
                  <select
                    value={itemForm.group_code}
                    onChange={(e) => setItemForm({ ...itemForm, group_code: e.target.value })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  >
                    {itemGroups.map((g) => (
                      <option key={g.group_code} value={g.group_code}>{g.group_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">نوع الصنف</label>
                  <input
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">وحدة القياس</label>
                  <input
                    value={itemForm.unit_of_measure}
                    onChange={(e) => setItemForm({ ...itemForm, unit_of_measure: e.target.value })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">تكلفة الشراء للوحدة</label>
                  <input
                    type="number"
                    value={itemForm.cost_price}
                    onChange={(e) => setItemForm({ ...itemForm, cost_price: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">سعر بيع الوحدة</label>
                  <input
                    type="number"
                    value={itemForm.unit_price}
                    onChange={(e) => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">الاحتياجات السنوية</label>
                  <input
                    type="number"
                    value={itemForm.annual_demand}
                    onChange={(e) => setItemForm({ ...itemForm, annual_demand: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">مخزون الأمان</label>
                  <input
                    type="number"
                    value={itemForm.safety_stock}
                    onChange={(e) => setItemForm({ ...itemForm, safety_stock: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">فترة الانتظار (أيام)</label>
                  <input
                    type="number"
                    value={itemForm.lead_time_days}
                    onChange={(e) => setItemForm({ ...itemForm, lead_time_days: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#B5AD99]">الكمية الاقتصادية (EOQ)</label>
                  <input
                    type="number"
                    value={itemForm.eoq}
                    onChange={(e) => setItemForm({ ...itemForm, eoq: Number(e.target.value) })}
                    className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  />
                </div>
              </div>
              <button type="submit" className="gold-metallic-btn px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> تسجيل الصنف في الدليل السلعي
              </button>
            </form>
          </div>

          <div className="royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل الأصناف المسجلة ونقاط إعادة الطلب ({items.length})</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2.5 px-2">كود الصنف</th>
                  <th className="py-2.5 px-2">اسم الصنف</th>
                  <th className="py-2.5 px-2">المجموعة</th>
                  <th className="py-2.5 px-2">الوحدة</th>
                  <th className="py-2.5 px-2">التكلفة</th>
                  <th className="py-2.5 px-2">سعر البيع</th>
                  <th className="py-2.5 px-2">مخزون الأمان</th>
                  <th className="py-2.5 px-2">حد الطلب</th>
                  <th className="py-2.5 px-2">EOQ</th>
                  <th className="py-2.5 px-2">الرصيد الحالي</th>
                  <th className="py-2.5 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {items.map((it) => (
                  <tr key={it.item_code} className="hover:bg-[#D4AF37]/5">
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{it.item_code}</td>
                    <td className="py-2.5 px-2 font-semibold">{it.item_name}</td>
                    <td className="py-2.5 px-2 text-[#B8AF9B]">{it.group_name}</td>
                    <td className="py-2.5 px-2">{it.unit_of_measure}</td>
                    <td className="py-2.5 px-2">{fmtMoney(it.cost_price, currency)}</td>
                    <td className="py-2.5 px-2">{fmtMoney(it.unit_price, currency)}</td>
                    <td className="py-2.5 px-2">{fmtNum(it.safety_stock)}</td>
                    <td className="py-2.5 px-2">{fmtNum(it.reorder_point)}</td>
                    <td className="py-2.5 px-2">{fmtNum(it.eoq)}</td>
                    <td className="py-2.5 px-2 font-bold">{fmtNum(it.current_balance)}</td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] ${
                          it.current_balance <= it.reorder_point
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {it.stock_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. العملاء */}
      {tab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/master/customers', { method: 'POST', body: JSON.stringify(custForm) });
                flash('ok', 'تم حفظ العميل بنجاح');
                setCustForm({ customer_id: '', customer_name: '', address: '', city: 'القاهرة', phone: '', email: '', credit_limit: 100000, opening_balance: 0 });
                loadAll();
              } catch (err: any) {
                flash('err', err.message);
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إضافة عميل جديد</h3>
            <input placeholder="رقم العميل (مثال: CUST-005)" value={custForm.customer_id} onChange={(e) => setCustForm({ ...custForm, customer_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="اسم العميل / المنشأة" value={custForm.customer_name} onChange={(e) => setCustForm({ ...custForm, customer_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="العنوان التفصيلي" value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="المدينة" value={custForm.city} onChange={(e) => setCustForm({ ...custForm, city: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <input placeholder="رقم الهاتف" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[11px] text-[#B5AD99]">الحد الأقصى للائتمان ({currency})</label>
              <input type="number" value={custForm.credit_limit} onChange={(e) => setCustForm({ ...custForm, credit_limit: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
            </div>
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ بيانات العميل</button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">قائمة العملاء والأرصدة اللحظية</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم العميل</th>
                  <th className="py-2 px-2">اسم العميل</th>
                  <th className="py-2 px-2">المدينة / الهاتف</th>
                  <th className="py-2 px-2">حد الائتمان</th>
                  <th className="py-2 px-2">الرصيد الصافي اللحظي</th>
                  <th className="py-2 px-2">الائتمان المتاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {customers.map((c) => (
                  <tr key={c.customer_id}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{c.customer_id}</td>
                    <td className="py-2.5 px-2 font-bold">{c.customer_name}</td>
                    <td className="py-2.5 px-2 text-[#B5AD99]">{c.city} • {c.phone}</td>
                    <td className="py-2.5 px-2">{fmtMoney(c.credit_limit, currency)}</td>
                    <td className="py-2.5 px-2 font-bold text-amber-300">{fmtMoney(c.net_balance, currency)}</td>
                    <td className="py-2.5 px-2 text-emerald-300">{fmtMoney(c.available_credit, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. الموردون */}
      {tab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/master/suppliers', { method: 'POST', body: JSON.stringify(suppForm) });
                flash('ok', 'تم حفظ المورد بنجاح');
                setSuppForm({ supplier_id: '', supplier_name: '', address: '', city: 'القاهرة', phone: '', email: '', opening_balance: 0 });
                loadAll();
              } catch (err: any) {
                flash('err', err.message);
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إضافة مورد جديد</h3>
            <input placeholder="رقم المورد (مثال: SUP-004)" value={suppForm.supplier_id} onChange={(e) => setSuppForm({ ...suppForm, supplier_id: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="اسم المورد" value={suppForm.supplier_name} onChange={(e) => setSuppForm({ ...suppForm, supplier_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="العنوان" value={suppForm.address} onChange={(e) => setSuppForm({ ...suppForm, address: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="المدينة" value={suppForm.city} onChange={(e) => setSuppForm({ ...suppForm, city: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <input placeholder="الهاتف" value={suppForm.phone} onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
            </div>
            <input type="email" placeholder="البريد الإلكتروني" value={suppForm.email} onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ بيانات المورد</button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">قائمة الموردين والأرصدة المستحقة</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم المورد</th>
                  <th className="py-2 px-2">اسم المورد</th>
                  <th className="py-2 px-2">المدينة</th>
                  <th className="py-2 px-2">الهاتف</th>
                  <th className="py-2 px-2">البريد الإلكتروني</th>
                  <th className="py-2 px-2">الرصيد الصافي المستحق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {suppliers.map((s) => (
                  <tr key={s.supplier_id}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{s.supplier_id}</td>
                    <td className="py-2.5 px-2 font-bold">{s.supplier_name}</td>
                    <td className="py-2.5 px-2">{s.city}</td>
                    <td className="py-2.5 px-2">{s.phone}</td>
                    <td className="py-2.5 px-2 text-[#B5AD99]">{s.email}</td>
                    <td className="py-2.5 px-2 font-bold text-amber-300">{fmtMoney(s.net_balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. الموظفون */}
      {tab === 'employees' && (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/master/employees', { method: 'POST', body: JSON.stringify(empForm) });
                flash('ok', 'تم تسجيل بيانات الموظف بنجاح');
                setEmpForm({ ...empForm, employee_code: '', employee_name: '' });
                loadAll();
              } catch (err: any) {
                flash('err', err.message);
              }
            }}
            className="royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إضافة موظف جديد (جدول بيانات العاملين - الموارد البشرية)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input placeholder="كود الموظف (EMP-006)" value={empForm.employee_code} onChange={(e) => setEmpForm({ ...empForm, employee_code: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" required />
              <input placeholder="اسم الموظف رباعياً" value={empForm.employee_name} onChange={(e) => setEmpForm({ ...empForm, employee_name: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" required />
              <input placeholder="المسمى الوظيفي" value={empForm.job_title} onChange={(e) => setEmpForm({ ...empForm, job_title: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" required />
              <select value={empForm.dept_code} onChange={(e) => setEmpForm({ ...empForm, dept_code: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs">
                {departments.map((d) => <option key={d.dept_code} value={d.dept_code}>{d.dept_name}</option>)}
              </select>
              <input placeholder="التخصص" value={empForm.specialization} onChange={(e) => setEmpForm({ ...empForm, specialization: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <input placeholder="المؤهل العلمي" value={empForm.qualification} onChange={(e) => setEmpForm({ ...empForm, qualification: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <select value={empForm.marital_status} onChange={(e) => setEmpForm({ ...empForm, marital_status: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs">
                <option value="أعزب">أعزب</option>
                <option value="متزوج">متزوج</option>
              </select>
              <input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <div>
                <label className="text-[11px] text-[#B5AD99]">الراتب الأساسي</label>
                <input type="number" value={empForm.basic_salary} onChange={(e) => setEmpForm({ ...empForm, basic_salary: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">بدل السكن</label>
                <input type="number" value={empForm.housing_allowance} onChange={(e) => setEmpForm({ ...empForm, housing_allowance: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">بدل الانتقال</label>
                <input type="number" value={empForm.transport_allowance} onChange={(e) => setEmpForm({ ...empForm, transport_allowance: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">بدل وجبة وبدلات أخرى</label>
                <input type="number" value={empForm.meal_allowance} onChange={(e) => setEmpForm({ ...empForm, meal_allowance: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <button type="submit" className="gold-metallic-btn px-5 py-2.5 rounded-xl text-xs cursor-pointer">تسجيل الموظف</button>
          </form>

          <div className="royal-card rounded-2xl p-5 overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">الكود</th>
                  <th className="py-2 px-2">الاسم</th>
                  <th className="py-2 px-2">الوظيفة / الإدارة</th>
                  <th className="py-2 px-2">المؤهل والتخصص</th>
                  <th className="py-2 px-2">الراتب الأساسي</th>
                  <th className="py-2 px-2">مجموع البدلات</th>
                  <th className="py-2 px-2">إجمالي الحزمة الشهرية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {employees.map((emp) => (
                  <tr key={emp.employee_code}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{emp.employee_code}</td>
                    <td className="py-2.5 px-2 font-bold">{emp.employee_name}</td>
                    <td className="py-2.5 px-2">{emp.job_title} • <span className="text-[#B5AD99]">{emp.dept_name}</span></td>
                    <td className="py-2.5 px-2 text-[#B5AD99]">{emp.qualification} ({emp.specialization})</td>
                    <td className="py-2.5 px-2">{fmtMoney(emp.basic_salary, currency)}</td>
                    <td className="py-2.5 px-2">{fmtMoney(emp.total_allowances, currency)}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(emp.gross_package, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. الإدارات والأقسام */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/master/departments', { method: 'POST', body: JSON.stringify(deptForm) });
                flash('ok', 'تمت إضافة الإدارة بنجاح');
                setDeptForm({ dept_code: '', dept_name: '', manager_name: '', description: '' });
                loadAll();
              } catch (err: any) {
                flash('err', err.message);
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إضافة إدارة / قسم</h3>
            <input placeholder="كود الإدارة (DEPT-IT)" value={deptForm.dept_code} onChange={(e) => setDeptForm({ ...deptForm, dept_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="اسم الإدارة" value={deptForm.dept_name} onChange={(e) => setDeptForm({ ...deptForm, dept_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="مدير الإدارة" value={deptForm.manager_name} onChange={(e) => setDeptForm({ ...deptForm, manager_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <input placeholder="وصف الاختصاصات" value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ الإدارة</button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">هيكل الإدارات والأقسام</h3>
            <div className="space-y-2.5">
              {departments.map((d) => (
                <div key={d.dept_code} className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#E5C158]">{d.dept_code}</span>
                      <span className="text-sm font-bold">{d.dept_name}</span>
                    </div>
                    <p className="text-xs text-[#A8A08D] mt-0.5">المدير المسؤول: {d.manager_name || '—'} • {d.description}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#FCE79C]">
                    {d.employee_count} موظف
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. حسابات البنوك */}
      {tab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/master/banks', { method: 'POST', body: JSON.stringify(bankForm) });
                flash('ok', 'تم حفظ الحساب البنكي بنجاح');
                setBankForm({ bank_account_number: '', bank_name: '', branch: '', currency: 'ج.م', opening_balance: 0, gl_account_code: '1102' });
                loadAll();
              } catch (err: any) {
                flash('err', err.message);
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إضافة حساب بنكي (جدول حسابات البنوك)</h3>
            <input placeholder="رقم الحساب البنكي / IBAN" value={bankForm.bank_account_number} onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="اسم البنك" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="الفرع" value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <div>
              <label className="text-[11px] text-[#B5AD99]">الرصيد الافتتاحي</label>
              <input type="number" value={bankForm.opening_balance} onChange={(e) => setBankForm({ ...bankForm, opening_balance: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
            </div>
            <div>
              <label className="text-[11px] text-[#B5AD99]">الحساب المقابل بدليل الحسابات</label>
              <select value={bankForm.gl_account_code} onChange={(e) => setBankForm({ ...bankForm, gl_account_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                {accounts.filter((a) => a.sub_group_code === '11').map((a) => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ الحساب البنكي</button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">حسابات البنوك المسجلة والأرصدة الحالية</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم الحساب البنكي</th>
                  <th className="py-2 px-2">اسم البنك</th>
                  <th className="py-2 px-2">الفرع</th>
                  <th className="py-2 px-2">الحساب العام المرتبط</th>
                  <th className="py-2 px-2">الرصيد الحالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {banks.map((b) => (
                  <tr key={b.bank_account_number}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{b.bank_account_number}</td>
                    <td className="py-2.5 px-2 font-bold">{b.bank_name}</td>
                    <td className="py-2.5 px-2">{b.branch}</td>
                    <td className="py-2.5 px-2 text-[#B5AD99]">{b.gl_account_code} - {b.gl_account_name}</td>
                    <td className="py-2.5 px-2 font-bold text-emerald-300">{fmtMoney(b.balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. بيانات الشركة */}
      {tab === 'company' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiFetch('/api/master/company', { method: 'PUT', body: JSON.stringify(company) });
              flash('ok', 'تم حفظ بيانات المنشأة بنجاح');
            } catch (err: any) {
              flash('err', err.message);
            }
          }}
          className="royal-card rounded-2xl p-6 max-w-3xl space-y-4"
        >
          <h3 className="text-base font-bold gold-gradient-text">بيانات المنشأة الأساسية للتقارير والفواتير</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#C7BFA9]">الاسم الرسمي للمنشأة</label>
              <input value={company.company_name || ''} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">السجل التجاري</label>
              <input value={company.commercial_reg || ''} onChange={(e) => setCompany({ ...company, commercial_reg: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">البطاقة الضريبية</label>
              <input value={company.tax_number || ''} onChange={(e) => setCompany({ ...company, tax_number: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">العنوان</label>
              <input value={company.address || ''} onChange={(e) => setCompany({ ...company, address: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">الهاتف</label>
              <input value={company.phone || ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">العملة المحاسبية</label>
              <input value={company.currency || ''} onChange={(e) => setCompany({ ...company, currency: e.target.value })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C7BFA9]">السنة المالية</label>
              <input type="number" value={company.fiscal_year || 2026} onChange={(e) => setCompany({ ...company, fiscal_year: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
          </div>
          <button type="submit" className="gold-metallic-btn px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer">
            <Save className="w-4 h-4" /> حفظ بيانات الشركة
          </button>
        </form>
      )}
    </div>
  );
};
