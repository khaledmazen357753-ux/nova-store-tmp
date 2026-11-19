import React, { useEffect, useState } from 'react';
import {
  Database,
  Landmark,
  ShoppingCart,
  Truck,
  Package,
  Users,
  FileBarChart2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { apiFetch, fmtMoney, fmtNum, todayIso } from '../bridge/api';
import { PlusSpinner } from '../components/BrandIdentity';

export type ModuleKey =
  | 'dashboard'
  | 'master'
  | 'finance'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'hr'
  | 'reports';

export const DashboardModule: React.FC<{
  onNavigate: (mod: ModuleKey) => void;
  currency?: string;
}> = ({ onNavigate, currency = 'ج.م' }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPoCode, setCreatingPoCode] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/reports/dashboard');
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const issueQuickPurchaseOrder = async (alertItem: any) => {
    setCreatingPoCode(alertItem.item_code);
    setToast('');
    try {
      const res = await apiFetch('/api/transactions/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          po_date: todayIso(),
          supplier_id: alertItem.suggested_supplier_id,
          expected_date: todayIso(),
          notes: `أمر توريد تلقائي لتعويض وصول الصنف (${alertItem.item_name}) لنقطة إعادة الطلب`,
          items: [
            {
              item_code: alertItem.item_code,
              quantity: alertItem.recommended_order_qty,
              unit_price: alertItem.cost_price,
            },
          ],
        }),
      });
      setToast(`تم إصدار أمر التوريد رقم (${res.po_no}) بنجاح بكمية اقتصادية (${alertItem.recommended_order_qty} ${alertItem.unit_of_measure})`);
      loadDashboard();
    } catch (err: any) {
      setToast(err.message || 'تعذر إصدار أمر التوريد');
    } finally {
      setCreatingPoCode(null);
    }
  };

  if (loading || !data) {
    return <PlusSpinner label="جارٍ استخراج المؤشرات المالية والرقابية اللحظية..." />;
  }

  const moduleCards: { key: ModuleKey; title: string; desc: string; badge: string; icon: React.ReactNode }[] = [
    {
      key: 'master',
      title: '1. وحدة البيانات الأساسية',
      desc: 'الشركة، الإدارات، الموظفون، العملاء، الموردون، مجموعات الأصناف، والبنوك',
      badge: `${data.counts.items} صنف • ${data.counts.customers} عميل`,
      icon: <Database className="w-6 h-6 text-[#D4AF37]" />,
    },
    {
      key: 'finance',
      title: '2. وحدة الإدارة المالية',
      desc: 'دليل الحسابات الشجري (3 مستويات)، قيود اليومية المتوازنة، وسندات الخزينة والشيكات',
      badge: 'توازن آلي 100%',
      icon: <Landmark className="w-6 h-6 text-[#D4AF37]" />,
    },
    {
      key: 'sales',
      title: '3. وحدة المبيعات والعملاء',
      desc: 'فواتير البيع الفرعية، إشعارات رد المبيعات، والتحصيل النقدي والبنكي من العملاء',
      badge: `${data.counts.sales_invoices} فاتورة بيع`,
      icon: <ShoppingCart className="w-6 h-6 text-[#D4AF37]" />,
    },
    {
      key: 'purchases',
      title: '4. وحدة المشتريات والموردين',
      desc: 'أوامر التوريد، فواتير الشراء، إشعارات رد المشتريات، وسداد مستحقات الموردين',
      badge: `${data.counts.purchase_orders_open} أمر توريد مفتوح`,
      icon: <Truck className="w-6 h-6 text-[#D4AF37]" />,
    },
    {
      key: 'inventory',
      title: '5. وحدة المخزون السلعي',
      desc: 'أذون الإضافة للمخزن، أذون الصرف، وبطاقة حركة الصنف للاستعلام اللحظي',
      badge: `${data.reorderAlerts.length} تنبيه طلب`,
      icon: <Package className="w-6 h-6 text-[#D4AF37]" />,
    },
    {
      key: 'hr',
      title: '6. وحدة الموارد البشرية',
      desc: 'سجل الحضور والانصراف اليومي واحتساب المستحقات والأجور الشهرية للعاملين',
      badge: `${data.counts.employees} موظف نشط`,
      icon: <Users className="w-6 h-6 text-[#D4AF37]" />,
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-xl bg-[#1C180B] border border-[#D4AF37] text-[#FCE79C] text-sm flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-xs underline cursor-pointer">إغلاق</button>
        </div>
      )}

      {/* شريط مؤشرات الأداء المالي اللحظي */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'النقدية بالخزينة والبنوك', val: data.kpis.cash_and_banks, icon: <Wallet className="w-5 h-5 text-[#D4AF37]" />, accent: 'text-[#FCE79C]' },
          { label: 'إجمالي مديونية العملاء', val: data.kpis.total_receivables, icon: <ShoppingCart className="w-5 h-5 text-emerald-400" />, accent: 'text-emerald-300' },
          { label: 'إجمالي مستحقات الموردين', val: data.kpis.total_payables, icon: <Truck className="w-5 h-5 text-amber-400" />, accent: 'text-amber-300' },
          { label: 'تقييم المخزون بالتكلفة', val: data.kpis.inventory_value, icon: <Package className="w-5 h-5 text-[#D4AF37]" />, accent: 'text-[#F5EFE0]' },
          { label: 'صافي الربح المحاسبي الجاري', val: data.kpis.net_profit, icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, accent: data.kpis.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="royal-card rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#B2A994] font-medium">{kpi.label}</span>
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                {kpi.icon}
              </div>
            </div>
            <div className={`text-lg font-extrabold tabular-nums ${kpi.accent}`}>
              {fmtMoney(kpi.val, currency)}
            </div>
          </div>
        ))}
      </div>

      {/* مؤشر التوازن المحاسبي والرقابة الذكية */}
      <div className="royal-card rounded-2xl p-4 md:p-5 border border-[#D4AF37]/35 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FAF5E8]">محرك التحقق من التوازن المحاسبي ومطابقة السجلات</h3>
            <p className="text-xs text-[#AEA590] mt-0.5">
              إجمالي قيود اليومية المدين ({fmtMoney(data.integrity.journal_debit, currency)}) = الدائن ({fmtMoney(data.integrity.journal_credit, currency)}) • مطابقة بطاقات الأصناف: {data.integrity.stock_reconciled ? 'مطابقة تامة 100%' : 'يوجد فروق'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('reports')}
          className="gold-metallic-btn px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <FileBarChart2 className="w-4 h-4" />
          <span>فتح القوائم المالية والتقارير (21 تقريراً)</span>
        </button>
      </div>

      {/* شبكة الوحدات الست الرئيسية للتطبيق (6 Core Modules) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold gold-gradient-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <span>الوحدات الرئيسية لمنظومة المحاسبي Plus (6 وحدات مترابطة)</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleCards.map((m) => (
            <button
              key={m.key}
              onClick={() => onNavigate(m.key)}
              className="text-right royal-card hover:border-[#D4AF37]/80 rounded-2xl p-5 transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/12 border border-[#D4AF37]/35 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {m.icon}
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#D4AF37]/12 text-[#ECCB65] border border-[#D4AF37]/25">
                    {m.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#FAF5E8] group-hover:text-[#FCE79C] mb-1.5">
                  {m.title}
                </h3>
                <p className="text-xs text-[#A89F8B] leading-relaxed">{m.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#D4AF37]/15 flex items-center justify-between text-xs text-[#D4AF37] font-semibold">
                <span>فتح شاشات الوحدة</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* تنبيهات رقابة المخزون ونقطة إعادة الطلب + أحدث قيود اليومية */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 royal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-[#FAF5E8]">
                رقابة المخزون وتنبيهات نقطة إعادة الطلب التلقائية ({data.reorderAlerts.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-[#E5C158] hover:underline cursor-pointer"
            >
              بطاقات الأصناف
            </button>
          </div>

          {data.reorderAlerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-emerald-300 bg-emerald-950/20 rounded-xl border border-emerald-500/25">
              جميع الأصناف بالمخازن أعلى من حد إعادة الطلب ومخزون الأمان.
            </div>
          ) : (
            <div className="space-y-3">
              {data.reorderAlerts.map((it: any) => (
                <div
                  key={it.item_code}
                  className="p-3.5 rounded-xl bg-[#0B0B0F] border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {it.item_code}
                      </span>
                      <span className="text-sm font-bold text-[#FAF5E8]">{it.item_name}</span>
                    </div>
                    <p className="text-xs text-[#B6AD98] mt-1 tabular-nums">
                      الرصيد الحالي: <strong className="text-amber-300">{fmtNum(it.current_balance)}</strong> {it.unit_of_measure} • حد إعادة الطلب: <strong>{fmtNum(it.reorder_point)}</strong> • مخزون الأمان: <strong>{fmtNum(it.safety_stock)}</strong> • الكمية الاقتصادية (EOQ): <strong>{fmtNum(it.eoq)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => issueQuickPurchaseOrder(it)}
                    disabled={creatingPoCode === it.item_code}
                    className="gold-metallic-btn px-3.5 py-2 rounded-xl text-xs shrink-0 cursor-pointer"
                  >
                    {creatingPoCode === it.item_code ? 'جارٍ الإصدار...' : 'إصدار أمر توريد فوري'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 royal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#FAF5E8]">أحدث قيود اليومية المرحّلة</h3>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs text-[#E5C158] hover:underline cursor-pointer"
            >
              سجل القيود الكامل
            </button>
          </div>
          <div className="space-y-2.5">
            {data.recentEntries.map((je: any) => (
              <div
                key={je.entry_number}
                className="p-3 rounded-xl bg-[#0B0B0F] border border-[#D4AF37]/20 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#E5C158]">{je.entry_number}</span>
                    <span className="text-[11px] text-[#968E7B]">{je.entry_date}</span>
                  </div>
                  <p className="text-xs text-[#EDE6D5] truncate mt-0.5">{je.description}</p>
                </div>
                <div className="text-xs font-bold text-emerald-300 tabular-nums shrink-0">
                  {fmtMoney(je.total_debit, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
