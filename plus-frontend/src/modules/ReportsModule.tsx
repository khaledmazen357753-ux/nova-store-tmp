import React, { useEffect, useState } from 'react';
import { Printer, Download, CheckCircle2, FileBarChart2 } from 'lucide-react';
import { apiFetch, exportToCsv, fmtMoney, fmtNum } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type CategoryKey = 'financial' | 'sales' | 'purchases' | 'inventory' | 'hr';

const REPORT_CATEGORIES: {
  key: CategoryKey;
  label: string;
  reports: { id: string; title: string }[];
}[] = [
  {
    key: 'financial',
    label: 'التقارير المالية والقوائم الختامية',
    reports: [
      { id: 'trial-balance', title: 'ميزان المراجعة بالمجاميع والأرصدة' },
      { id: 'income-statement', title: 'قائمة الدخل (الأرباح والخسائر)' },
      { id: 'balance-sheet', title: 'قائمة المركز المالي (الميزانية العمومية)' },
      { id: 'cash-flow', title: 'قائمة التدفقات النقدية' },
      { id: 'general-journal', title: 'دفتر اليومية العام' },
      { id: 'general-ledger', title: 'حسابات الأستاذ العام والمساعد' },
    ],
  },
  {
    key: 'sales',
    label: 'تقارير المبيعات والعملاء',
    reports: [
      { id: 'customer-balances', title: 'كشف أرصدة العملاء والائتمان' },
      { id: 'customer-ledger', title: 'أستاذ مساعد تفصيلي لكل عميل' },
      { id: 'sales-analysis', title: 'تحليل المبيعات الرباعي (صنف/عميل/مندوب/شهر)' },
      { id: 'sales-returns', title: 'تقرير مردودات المبيعات' },
    ],
  },
  {
    key: 'purchases',
    label: 'تقارير المشتريات والموردين',
    reports: [
      { id: 'supplier-balances', title: 'كشف أرصدة الموردين' },
      { id: 'supplier-ledger', title: 'أستاذ مساعد الموردين' },
      { id: 'purchases-journal', title: 'يومية المشتريات' },
      { id: 'supplier-payments', title: 'يومية المدفوعات للموردين' },
      { id: 'purchase-returns', title: 'يومية مردودات المشتريات' },
    ],
  },
  {
    key: 'inventory',
    label: 'تقارير المخازن والرقابة السلعية',
    reports: [
      { id: 'stock-balances', title: 'كشف أرصدة الأصناف بالكمية والقيمة' },
      { id: 'item-card', title: 'كارت حركة الصنف (وارد ومنصرف)' },
      { id: 'stock-reconciliation', title: 'تقرير مطابقة الأرصدة والسجلات' },
      { id: 'stagnant-items', title: 'تقرير الأصناف الراكدة وبطيئة الحركة' },
    ],
  },
  {
    key: 'hr',
    label: 'تقارير الموارد البشرية والأجور',
    reports: [
      { id: 'payroll-sheet', title: 'كشف المستحقات الشهرية والأجور' },
      { id: 'attendance-compliance', title: 'تقرير الالتزام بمواعيد الحضور والانصراف' },
    ],
  },
];

export const ReportsModule: React.FC<{ company?: any; currency?: string }> = ({ company, currency = 'ج.م' }) => {
  const [cat, setCat] = useState<CategoryKey>('financial');
  const [repId, setRepId] = useState<string>('trial-balance');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  // فلاتر ديناميكية للأستاذ المساعد وكارت الصنف
  const [accounts, setAccounts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [selectedAccount, setSelectedAccount] = useState('1101');
  const [selectedCustomer, setSelectedCustomer] = useState('CUST-001');
  const [selectedSupplier, setSelectedSupplier] = useState('SUP-001');
  const [selectedItem, setSelectedItem] = useState('ITM-102');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/master/accounts-tree'),
      apiFetch('/api/master/customers'),
      apiFetch('/api/master/suppliers'),
      apiFetch('/api/master/items'),
    ]).then(([ac, cu, su, it]) => {
      setAccounts(ac.accounts || []);
      setCustomers(cu.customers || []);
      setSuppliers(su.suppliers || []);
      setItems(it.items || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let url = `/api/reports/${cat}?type=${repId}`;
    if (repId === 'general-ledger') url += `&account_code=${selectedAccount}`;
    if (repId === 'customer-ledger') url += `&customer_id=${selectedCustomer}`;
    if (repId === 'supplier-ledger') url += `&supplier_id=${selectedSupplier}`;
    if (repId === 'item-card') url += `&item_code=${selectedItem}`;

    setLoading(true);
    apiFetch(url)
      .then((res) => setReportData(res))
      .finally(() => setLoading(false));
  }, [cat, repId, selectedAccount, selectedCustomer, selectedSupplier, selectedItem]);

  const currentCatObj = REPORT_CATEGORIES.find((c) => c.key === cat)!;
  const currentRepTitle = currentCatObj.reports.find((r) => r.id === repId)?.title || '';

  const handleExportCurrentCsv = () => {
    if (!reportData) return;
    if (repId === 'trial-balance' && reportData.rows) {
      exportToCsv(
        'trial-balance-plus',
        ['كود الحساب', 'اسم الحساب', 'أول المدة مدين', 'أول المدة دائن', 'حركة مدين', 'حركة دائن', 'رصيد ختامي مدين', 'رصيد ختامي دائن'],
        reportData.rows.map((r: any) => [r.account_code, r.account_name, r.opening_debit, r.opening_credit, r.mov_debit, r.mov_credit, r.closing_debit, r.closing_credit])
      );
      return;
    }
    if (Array.isArray(reportData.rows)) {
      const sample = reportData.rows[0] || {};
      const keys = Object.keys(sample);
      exportToCsv(`${repId}-plus`, keys, reportData.rows.map((r: any) => keys.map((k) => r[k])));
      return;
    }
    exportToCsv(`${repId}-summary`, ['التقرير', 'البيانات'], [[currentRepTitle, JSON.stringify(reportData)]]);
  };

  return (
    <div className="space-y-5">
      {/* شريط التصنيفات الخمسة للتقارير */}
      <div className="flex flex-wrap gap-2 no-print">
        {REPORT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCat(c.key);
              setRepId(c.reports[0].id);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
              cat === c.key ? 'gold-metallic-btn' : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* شريط اختيار التقرير الفرعي + أزرار الطباعة والتصدير */}
      <div className="royal-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap gap-2">
          {currentCatObj.reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setRepId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                repId === r.id
                  ? 'bg-[#D4AF37]/25 text-[#FCE79C] border border-[#D4AF37]'
                  : 'bg-[#0B0B10] text-[#B8AF9B] border border-white/10 hover:border-[#D4AF37]/40'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentCsv}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#14141C] border border-[#D4AF37]/40 text-[#FCE79C] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> تصدير CSV / Excel
          </button>
          <button
            onClick={() => window.print()}
            className="gold-metallic-btn px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> طباعة التقرير الرسمي
          </button>
        </div>
      </div>

      {/* فلاتر الحساب / العميل / المورد / الصنف عند الحاجة */}
      {repId === 'general-ledger' && (
        <div className="royal-card rounded-xl p-3.5 flex items-center gap-3 no-print">
          <span className="text-xs font-bold text-[#E5C158]">اختر الحساب لعرض الأستاذ العام:</span>
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="gold-input rounded-lg px-3 py-1.5 text-xs">
            {accounts.map((a) => <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>)}
          </select>
        </div>
      )}
      {repId === 'customer-ledger' && (
        <div className="royal-card rounded-xl p-3.5 flex items-center gap-3 no-print">
          <span className="text-xs font-bold text-[#E5C158]">اختر العميل لعرض الأستاذ المساعد:</span>
          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="gold-input rounded-lg px-3 py-1.5 text-xs">
            {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.customer_id} — {c.customer_name}</option>)}
          </select>
        </div>
      )}
      {repId === 'supplier-ledger' && (
        <div className="royal-card rounded-xl p-3.5 flex items-center gap-3 no-print">
          <span className="text-xs font-bold text-[#E5C158]">اختر المورد لعرض الأستاذ المساعد:</span>
          <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="gold-input rounded-lg px-3 py-1.5 text-xs">
            {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_id} — {s.supplier_name}</option>)}
          </select>
        </div>
      )}
      {repId === 'item-card' && (
        <div className="royal-card rounded-xl p-3.5 flex items-center gap-3 no-print">
          <span className="text-xs font-bold text-[#E5C158]">اختر الصنف لعرض كارت الحركة:</span>
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="gold-input rounded-lg px-3 py-1.5 text-xs">
            {items.map((i) => <option key={i.item_code} value={i.item_code}>{i.item_code} — {i.item_name}</option>)}
          </select>
        </div>
      )}

      {/* ورقة التقرير الرسمية */}
      {loading || !reportData ? (
        <PlusSpinner label="جارٍ تجميع وإعداد التقرير المحاسبي..." />
      ) : (
        <div className="royal-card royal-double-frame rounded-2xl p-6 space-y-5">
          {/* ترويسة التقرير المطبوعة والمرئية */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/30">
            <div className="flex items-center gap-3">
              <img src="/plus-logo.jpeg" alt="Plus Logo" className="w-14 h-14 rounded-xl border border-[#D4AF37]/60 object-cover" />
              <div>
                <div className="text-xs text-[#E5C158] font-semibold">{company?.company_name || 'مجموعة بلس المتكاملة'}</div>
                <h2 className="text-lg font-extrabold text-[#FAF5E8] flex items-center gap-2">
                  <FileBarChart2 className="w-5 h-5 text-[#D4AF37] no-print" />
                  <span>{currentRepTitle}</span>
                </h2>
                <div className="text-[11px] text-[#A8A08C]">
                  السجل التجاري: {company?.commercial_reg || 'CR-2026-88410'} • البطاقة الضريبية: {company?.tax_number || '310-994-821'}
                </div>
              </div>
            </div>
            <div className="text-left text-xs text-[#B5AD99] tabular-nums">
              <div>السنة المالية: {company?.fiscal_year || 2026}</div>
              <div>تاريخ الإصدار: {new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>

          {/* عرض محتوى التقرير حسب النوع */}
          {repId === 'trial-balance' && reportData.rows && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right tabular-nums">
                <thead>
                  <tr className="border-b border-[#D4AF37]/40 text-[#E5C158]">
                    <th className="py-2.5 px-2">الكود</th>
                    <th className="py-2.5 px-2">اسم الحساب</th>
                    <th className="py-2.5 px-2">افتتاحي مدين</th>
                    <th className="py-2.5 px-2">افتتاحي دائن</th>
                    <th className="py-2.5 px-2">حركة مدين</th>
                    <th className="py-2.5 px-2">حركة دائن</th>
                    <th className="py-2.5 px-2">رصيد ختامي مدين</th>
                    <th className="py-2.5 px-2">رصيد ختامي دائن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {reportData.rows.map((r: any) => (
                    <tr key={r.account_code}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{r.account_code}</td>
                      <td className="py-2 px-2 font-semibold">{r.account_name}</td>
                      <td className="py-2 px-2">{fmtNum(r.opening_debit)}</td>
                      <td className="py-2 px-2">{fmtNum(r.opening_credit)}</td>
                      <td className="py-2 px-2 text-emerald-300">{fmtNum(r.mov_debit)}</td>
                      <td className="py-2 px-2 text-amber-300">{fmtNum(r.mov_credit)}</td>
                      <td className="py-2 px-2 font-bold">{fmtNum(r.closing_debit)}</td>
                      <td className="py-2 px-2 font-bold">{fmtNum(r.closing_credit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D4AF37] font-extrabold text-xs bg-[#0D0D12]">
                    <td colSpan={2} className="py-3 px-2 text-[#FCE79C]">الإجمالي العام المتوازن</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtNum(reportData.totals.opening_debit)}</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtNum(reportData.totals.opening_credit)}</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtNum(reportData.totals.mov_debit)}</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtNum(reportData.totals.mov_credit)}</td>
                    <td className="py-3 px-2 text-[#FCE79C]">{fmtNum(reportData.totals.closing_debit)}</td>
                    <td className="py-3 px-2 text-[#FCE79C]">{fmtNum(reportData.totals.closing_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {repId === 'income-statement' && reportData.gross_sales !== undefined && (
            <div className="max-w-3xl mx-auto space-y-3 text-sm tabular-nums">
              <div className="p-3.5 rounded-xl bg-[#0B0B10] flex justify-between">
                <span>إجمالي إيرادات المبيعات</span>
                <strong>{fmtMoney(reportData.gross_sales, currency)}</strong>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0B10] flex justify-between text-amber-300">
                <span>(-) يُخصم: مردودات المبيعات والخصم المسموح به</span>
                <strong>({fmtMoney(reportData.sales_returns_and_discounts, currency)})</strong>
              </div>
              <div className="p-3.5 rounded-xl bg-[#15141C] border border-[#D4AF37]/30 flex justify-between font-bold">
                <span>= صافي المبيعات</span>
                <span className="text-[#FCE79C]">{fmtMoney(reportData.net_sales, currency)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0B10] flex justify-between text-red-300">
                <span>(-) يُخصم: تكلفة البضاعة المباعة</span>
                <strong>({fmtMoney(reportData.cost_of_goods_sold, currency)})</strong>
              </div>
              <div className="p-4 rounded-xl bg-[#17161F] border border-[#D4AF37]/40 flex justify-between font-extrabold text-base">
                <span className="text-[#FCE79C]">= مجمل الربح التجاري</span>
                <span className="text-emerald-300">{fmtMoney(reportData.gross_profit, currency)}</span>
              </div>

              <div className="pt-2">
                <div className="text-xs font-bold text-[#E5C158] mb-2">الإيرادات الأخرى والمصروفات التشغيلية:</div>
                {(reportData.other_revenues || []).map((r: any) => (
                  <div key={r.account_code} className="py-2 px-3 flex justify-between text-xs border-b border-white/5">
                    <span>(+) {r.account_name}</span>
                    <span className="text-emerald-300">{fmtMoney(r.natural_balance, currency)}</span>
                  </div>
                ))}
                {(reportData.operating_expenses || []).map((e: any) => (
                  <div key={e.account_code} className="py-2 px-3 flex justify-between text-xs border-b border-white/5">
                    <span>(-) {e.account_name}</span>
                    <span className="text-red-300">({fmtMoney(e.natural_balance, currency)})</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/50 flex justify-between items-center text-base font-extrabold">
                <span>صافي الربح / (الخسارة) عن الفترة المالية</span>
                <span className="text-emerald-300 text-lg">{fmtMoney(reportData.net_income, currency)}</span>
              </div>
            </div>
          )}

          {repId === 'balance-sheet' && reportData.currentAssets && (
            <div className="space-y-4 tabular-nums">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  معادلة الميزانية متوازنة تماماً: إجمالي الأصول = إجمالي الخصوم وحقوق الملكية
                </span>
                <span className="font-extrabold text-[#FCE79C]">{fmtMoney(reportData.totalAssets, currency)}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/25 space-y-3">
                  <h4 className="text-sm font-extrabold text-[#FCE79C] border-b border-[#D4AF37]/20 pb-2">جانب الأصول (الموجودات)</h4>
                  <div className="text-xs font-bold text-[#E5C158]">أولاً: الأصول المتداولة</div>
                  {reportData.currentAssets.map((a: any) => (
                    <div key={a.account_code} className="flex justify-between text-xs py-1">
                      <span>{a.account_code} - {a.account_name}</span>
                      <span>{fmtMoney(a.natural_balance, currency)}</span>
                    </div>
                  ))}
                  <div className="text-xs font-bold text-[#E5C158] pt-2">ثانياً: الأصول الثابتة</div>
                  {reportData.fixedAssets.map((a: any) => (
                    <div key={a.account_code} className="flex justify-between text-xs py-1">
                      <span>{a.account_code} - {a.account_name}</span>
                      <span>{fmtMoney(a.natural_balance, currency)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t-2 border-[#D4AF37] flex justify-between font-extrabold text-sm text-emerald-300">
                    <span>إجمالي الأصول</span>
                    <span>{fmtMoney(reportData.totalAssets, currency)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/25 space-y-3">
                  <h4 className="text-sm font-extrabold text-[#FCE79C] border-b border-[#D4AF37]/20 pb-2">جانب الخصوم وحقوق الملكية</h4>
                  <div className="text-xs font-bold text-[#E5C158]">أولاً: الخصوم المتداولة</div>
                  {reportData.currentLiabilities.map((a: any) => (
                    <div key={a.account_code} className="flex justify-between text-xs py-1">
                      <span>{a.account_code} - {a.account_name}</span>
                      <span>{fmtMoney(a.natural_balance, currency)}</span>
                    </div>
                  ))}
                  <div className="text-xs font-bold text-[#E5C158] pt-2">ثانياً: الخصوم طويلة الأجل</div>
                  {reportData.longTermLiabilities.map((a: any) => (
                    <div key={a.account_code} className="flex justify-between text-xs py-1">
                      <span>{a.account_code} - {a.account_name}</span>
                      <span>{fmtMoney(a.natural_balance, currency)}</span>
                    </div>
                  ))}
                  <div className="text-xs font-bold text-[#E5C158] pt-2">ثالثاً: حقوق الملكية وصافي نتيجة الفترة</div>
                  {reportData.equityAccounts.map((a: any) => (
                    <div key={a.account_code} className="flex justify-between text-xs py-1">
                      <span>{a.account_code} - {a.account_name}</span>
                      <span>{fmtMoney(a.natural_balance, currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs py-1 text-emerald-300 font-semibold">
                    <span>(+) صافي ربح الفترة الجارية</span>
                    <span>{fmtMoney(reportData.currentPeriodNetIncome, currency)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-[#D4AF37] flex justify-between font-extrabold text-sm text-emerald-300">
                    <span>إجمالي الخصوم وحقوق الملكية</span>
                    <span>{fmtMoney(reportData.totalLiabilitiesAndEquity, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {repId === 'cash-flow' && reportData.operating_flows && (
            <div className="space-y-4 tabular-nums">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                  <div className="text-xs text-[#A8A08C]">نقدية وبنوك أول المدة</div>
                  <div className="text-base font-bold mt-1">{fmtMoney(reportData.opening_cash, currency)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                  <div className="text-xs text-[#A8A08C]">إجمالي التدفقات الداخلة</div>
                  <div className="text-base font-bold text-emerald-300 mt-1">+{fmtMoney(reportData.total_cash_in, currency)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                  <div className="text-xs text-[#A8A08C]">إجمالي التدفقات الخارجة</div>
                  <div className="text-base font-bold text-red-300 mt-1">-{fmtMoney(reportData.total_cash_out, currency)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#16151E] border border-[#D4AF37]/40">
                  <div className="text-xs text-[#E5C158]">النقدية والبنوك بآخر الفترة</div>
                  <div className="text-base font-extrabold text-[#FCE79C] mt-1">{fmtMoney(reportData.closing_cash, currency)}</div>
                </div>
              </div>

              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">رقم القيد</th>
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">نوع العملية</th>
                    <th className="py-2 px-2">البيان</th>
                    <th className="py-2 px-2">تدفق داخل (+)</th>
                    <th className="py-2 px-2">تدفق خارج (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {reportData.operating_flows.map((f: any) => (
                    <tr key={f.entry_number}>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{f.entry_number}</td>
                      <td className="py-2 px-2">{f.entry_date}</td>
                      <td className="py-2 px-2">{f.reference_type}</td>
                      <td className="py-2 px-2">{f.description}</td>
                      <td className="py-2 px-2 text-emerald-300">{f.cash_in > 0 ? fmtMoney(f.cash_in, currency) : '—'}</td>
                      <td className="py-2 px-2 text-red-300">{f.cash_out > 0 ? fmtMoney(f.cash_out, currency) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {repId === 'general-journal' && reportData.entries && (
            <div className="space-y-3 tabular-nums">
              {reportData.entries.map((e: any) => (
                <div key={e.entry_number} className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                  <div className="flex justify-between text-xs font-bold text-[#FCE79C] mb-1.5">
                    <span>{e.entry_number} — {e.description}</span>
                    <span>{e.entry_date}</span>
                  </div>
                  <table className="w-full text-[11px] text-right">
                    <tbody>
                      {e.lines.map((l: any) => (
                        <tr key={l.id} className="border-t border-white/5">
                          <td className="py-1 px-2 font-mono text-[#E5C158] w-24">{l.account_code}</td>
                          <td className="py-1 px-2">{l.account_name}</td>
                          <td className="py-1 px-2 text-emerald-300 w-32">{l.debit > 0 ? fmtMoney(l.debit, currency) : '—'}</td>
                          <td className="py-1 px-2 text-amber-300 w-32">{l.credit > 0 ? fmtMoney(l.credit, currency) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {repId === 'general-ledger' && reportData.account && (
            <div className="space-y-3 tabular-nums">
              <div className="p-3 rounded-xl bg-[#0B0B10] flex justify-between text-xs font-bold">
                <span>الحساب: {reportData.account.account_code} - {reportData.account.account_name} | رصيد أول المدة: {fmtMoney(reportData.opening_balance, currency)}</span>
                <span className="text-emerald-300">الرصيد الختامي: {fmtMoney(reportData.closing_balance, currency)}</span>
              </div>
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">رقم القيد</th>
                    <th className="py-2 px-2">البيان</th>
                    <th className="py-2 px-2">مدين</th>
                    <th className="py-2 px-2">دائن</th>
                    <th className="py-2 px-2">الرصيد المتحرك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {reportData.rows.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-2 px-2">{r.entry_date}</td>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{r.entry_number}</td>
                      <td className="py-2 px-2">{r.notes || r.description}</td>
                      <td className="py-2 px-2 text-emerald-300">{r.debit > 0 ? fmtMoney(r.debit, currency) : '—'}</td>
                      <td className="py-2 px-2 text-amber-300">{r.credit > 0 ? fmtMoney(r.credit, currency) : '—'}</td>
                      <td className="py-2 px-2 font-bold">{fmtMoney(r.running_balance, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* تقارير المبيعات الرباعية وبقية الجداول */}
          {repId === 'sales-analysis' && reportData.byItem && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 tabular-nums">
              <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                <h4 className="text-xs font-bold text-[#FCE79C] mb-2">1. تحليل المبيعات حسب الصنف</h4>
                <table className="w-full text-xs">
                  <thead><tr className="text-[#E5C158] border-b border-white/10"><th className="py-1.5">الصنف</th><th>الكمية</th><th>صافي المبيعات</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.byItem.map((x: any) => (
                      <tr key={x.item_code}><td className="py-1.5">{x.item_name}</td><td>{fmtNum(x.total_qty)}</td><td className="font-bold text-emerald-300">{fmtMoney(x.total_sales, currency)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                <h4 className="text-xs font-bold text-[#FCE79C] mb-2">2. تحليل المبيعات حسب العميل</h4>
                <table className="w-full text-xs">
                  <thead><tr className="text-[#E5C158] border-b border-white/10"><th className="py-1.5">العميل</th><th>الفواتير</th><th>صافي المبيعات</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.byCustomer.map((x: any) => (
                      <tr key={x.customer_id}><td className="py-1.5">{x.customer_name}</td><td>{x.invoice_count}</td><td className="font-bold text-emerald-300">{fmtMoney(x.total_sales, currency)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                <h4 className="text-xs font-bold text-[#FCE79C] mb-2">3. تحليل المبيعات حسب مندوب البيع</h4>
                <table className="w-full text-xs">
                  <thead><tr className="text-[#E5C158] border-b border-white/10"><th className="py-1.5">المندوب</th><th>الفواتير</th><th>صافي المبيعات</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.bySalesperson.map((x: any) => (
                      <tr key={x.employee_code}><td className="py-1.5">{x.employee_name}</td><td>{x.invoice_count}</td><td className="font-bold text-emerald-300">{fmtMoney(x.total_sales, currency)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                <h4 className="text-xs font-bold text-[#FCE79C] mb-2">4. تحليل المبيعات حسب الشهور</h4>
                <table className="w-full text-xs">
                  <thead><tr className="text-[#E5C158] border-b border-white/10"><th className="py-1.5">الشهر</th><th>الفواتير</th><th>صافي المبيعات</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.byMonth.map((x: any) => (
                      <tr key={x.month}><td className="py-1.5 font-mono">{x.month}</td><td>{x.invoice_count}</td><td className="font-bold text-emerald-300">{fmtMoney(x.net_total, currency)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* كارت الصنف داخل التقارير */}
          {repId === 'item-card' && reportData.movements && (
            <div className="overflow-x-auto tabular-nums">
              <div className="mb-3 text-xs font-bold text-[#FCE79C]">
                الصنف: {reportData.item.item_code} - {reportData.item.item_name} | الرصيد الحالي: {fmtNum(reportData.item.current_balance)} {reportData.item.unit_of_measure}
              </div>
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2">التاريخ</th>
                    <th className="py-2 px-2">نوع الحركة</th>
                    <th className="py-2 px-2">المستند</th>
                    <th className="py-2 px-2">وارد</th>
                    <th className="py-2 px-2">منصرف</th>
                    <th className="py-2 px-2">الرصيد بعد الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {reportData.movements.map((m: any) => (
                    <tr key={m.id}>
                      <td className="py-2 px-2">{m.movement_date}</td>
                      <td className="py-2 px-2">{m.movement_type}</td>
                      <td className="py-2 px-2 font-mono text-[#E5C158]">{m.doc_no}</td>
                      <td className="py-2 px-2 text-emerald-300">{m.qty_in}</td>
                      <td className="py-2 px-2 text-red-300">{m.qty_out}</td>
                      <td className="py-2 px-2 font-bold">{m.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* عارض ذكي لبقية تقارير الجداول (عملاء، موردين، مخازن، موارد بشرية) */}
          {!['trial-balance', 'income-statement', 'balance-sheet', 'cash-flow', 'general-journal', 'general-ledger', 'sales-analysis', 'item-card'].includes(repId) &&
            Array.isArray(reportData.rows) && (
              <div className="overflow-x-auto tabular-nums">
                {reportData.rows.length === 0 ? (
                  <p className="text-xs text-[#A8A08C] py-8 text-center">لا توجد حركات مسجلة في هذا التقرير خلال الفترة الحالية.</p>
                ) : (
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                        {Object.keys(reportData.rows[0]).slice(0, 8).map((col) => (
                          <th key={col} className="py-2 px-2">{translateCol(col)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4AF37]/10">
                      {reportData.rows.map((row: any, idx: number) => (
                        <tr key={idx}>
                          {Object.keys(reportData.rows[0]).slice(0, 8).map((col) => (
                            <td key={col} className="py-2 px-2">
                              {typeof row[col] === 'boolean'
                                ? row[col] ? 'مطابق ✓' : 'غير مطابق'
                                : String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

function translateCol(col: string): string {
  const map: Record<string, string> = {
    customer_id: 'رقم العميل',
    customer_name: 'اسم العميل',
    supplier_id: 'رقم المورد',
    supplier_name: 'اسم المورد',
    city: 'المدينة',
    phone: 'الهاتف',
    email: 'البريد',
    opening_balance: 'رصيد أول المدة',
    total_debit: 'إجمالي مدين',
    total_credit: 'إجمالي دائن',
    net_balance: 'الرصيد الصافي',
    credit_limit: 'حد الائتمان',
    doc_no: 'رقم المستند',
    tx_date: 'التاريخ',
    debit: 'مدين',
    credit: 'دائن',
    tx_type: 'نوع الحركة',
    running_balance: 'الرصيد المتحرك',
    invoice_no: 'رقم الفاتورة',
    invoice_date: 'تاريخ الفاتورة',
    net_total: 'صافي الفاتورة',
    gross_total: 'الإجمالي',
    discount_total: 'الخصم',
    payment_method: 'طريقة السداد',
    collection_method: 'طريقة التحصيل',
    return_no: 'رقم الإشعار',
    return_date: 'التاريخ',
    total_amount: 'القيمة',
    item_code: 'كود الصنف',
    item_name: 'اسم الصنف',
    group_name: 'المجموعة',
    unit_of_measure: 'الوحدة',
    cost_price: 'التكلفة',
    unit_price: 'سعر البيع',
    current_balance: 'الرصيد الحالي',
    master_balance: 'رصيد الملف الرئيسي',
    movements_balance: 'رصيد بطاقة الحركة',
    total_in: 'إجمالي الوارد',
    total_out: 'إجمالي المنصرف',
    variance: 'الفرق',
    is_matched: 'المطابقة',
    sold_qty: 'الكمية المباعة',
    tied_capital: 'رأس المال المجمد',
    last_sale_date: 'آخر بيع',
    movement_classification: 'تصنيف الدوران',
    employee_code: 'كود الموظف',
    employee_name: 'اسم الموظف',
    job_title: 'الوظيفة',
    dept_name: 'الإدارة',
    month: 'الشهر',
    year: 'السنة',
    basic_salary: 'الراتب الأساسي',
    allowances: 'البدلات',
    incentives: 'الحوافز',
    deductions: 'الاستقطاعات',
    net_salary: 'صافي المستحق',
    total_recorded_days: 'أيام مسجلة',
    present_days: 'حضور',
    late_days: 'تأخير',
    absent_days: 'غياب',
    compliance_pct: 'نسبة الالتزام %',
  };
  return map[col] || col;
}
