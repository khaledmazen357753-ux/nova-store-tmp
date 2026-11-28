import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Wallet, Package, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, KPI, Money, Num, Badge, Table, Spinner, Notice, Button } from './ui';

/**
 * لوحة المشتريات.
 *
 * كل رقم هنا يأتي من `/api/reports/...` — أي من نفس الاستعلامات التي
 * تُغذّي التقارير الرسمية. لم أكتب استعلاماً واحداً في الواجهة: لو فعلت،
 * لتكرّر منطق الرصيد في مكانين واختلفا عند أول تعديل.
 */

interface Dashboard {
  kpis: {
    cash_and_banks: number;
    total_payables: number;
    inventory_value: number;
    purchase_orders_open: number;
  };
  reorderAlerts: {
    item_code: string;
    item_name: string;
    current_balance: number;
    reorder_point: number;
    safety_stock: number;
    shortage: number;
    recommended_order_qty: number;
    suggested_supplier_name: string;
  }[];
  counts: Record<string, number>;
  balanceCheck?: { total_debit: number; total_credit: number; is_balanced: boolean };
  stockCheck?: { mismatched: number };
}

export const Dashboard: React.FC<{ currency: string; onNavigate: (key: string) => void }> = ({
  currency,
  onNavigate,
}) => {
  const [data, setData] = useState<Dashboard | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [dash, supp] = await Promise.all([
          apiFetch('/api/reports/dashboard'),
          apiFetch('/api/master/suppliers'),
        ]);
        setData(dash as Dashboard);
        setSuppliers(supp.suppliers || []);
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, []);

  if (error) {
    return (
      <Notice tone="err">
        تعذّر تحميل لوحة المشتريات: {error}
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            إعادة تحميل
          </Button>
        </div>
      </Notice>
    );
  }
  if (!data) return <Spinner label="جارٍ قراءة أرصدة المشتريات والمخزون من قاعدة البيانات…" />;

  const payables = Number(data.kpis.total_payables || 0);
  const topSupplier = [...suppliers].sort((a, b) => Number(b.net_balance) - Number(a.net_balance))[0];
  const balanced = data.balanceCheck?.is_balanced ?? true;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KPI
          label="مستحقات الموردين"
          value={<Money value={payables} currency={currency} /> as unknown as string}
          hint={`${data.counts.suppliers || suppliers.length} مورد · رصيد حساب 2101`}
          tone="gold"
        />
        <KPI
          label="قيمة المخزون بالتكلفة"
          value={<Money value={data.kpis.inventory_value} currency={currency} /> as unknown as string}
          hint={`${data.counts.items || 0} صنف · رصيد حساب 1104`}
          tone="neutral"
        />
        <KPI
          label="أوامر توريد قيد التنفيذ"
          value={String(data.kpis.purchase_orders_open ?? 0)}
          hint="بانتظار استلام البضاعة"
          tone="green"
        />
        <KPI
          label="أصناف تحت حد الطلب"
          value={String(data.reorderAlerts.length)}
          hint={data.reorderAlerts.length ? 'تحتاج أمر توريد' : 'كل الأصناف فوق الحد'}
          tone={data.reorderAlerts.length ? 'red' : 'green'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="تنبيهات إعادة الطلب"
          subtitle="الأصناف التي وصل رصيدها إلى نقطة إعادة الطلب أو تحتها — بترتيب الأشد نقصاً"
          className="lg:col-span-2"
          actions={
            <Button size="sm" variant="outline" onClick={() => onNavigate('purchase-orders')}>
              إصدار أمر توريد
            </Button>
          }
        >
          <Table
            head={['الصنف', 'الرصيد', 'حد الطلب', 'حد الأمان', 'النقص', 'كمية مقترحة', 'المورد']}
            empty="لا يوجد صنف تحت حد الطلب حالياً"
          >
            {data.reorderAlerts.map((a) => (
              <tr key={a.item_code} className="hover:bg-[#D4AF37]/5">
                <td className="py-2 px-2">
                  <div className="font-bold text-[#F7F3E8]">{a.item_name}</div>
                  <div className="text-[10px] text-[#7C7565]" dir="ltr">
                    {a.item_code}
                  </div>
                </td>
                <td className="py-2 px-2 text-red-300 font-bold">
                  <Num value={a.current_balance} />
                </td>
                <td className="py-2 px-2">
                  <Num value={a.reorder_point} />
                </td>
                <td className="py-2 px-2">
                  <Num value={a.safety_stock} />
                </td>
                <td className="py-2 px-2 text-amber-300">
                  <Num value={a.shortage} />
                </td>
                <td className="py-2 px-2 text-emerald-300 font-bold">
                  <Num value={a.recommended_order_qty} />
                </td>
                <td className="py-2 px-2 text-[10px] text-[#A9A292]">{a.suggested_supplier_name}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <div className="space-y-4">
          <Card title="سلامة البيانات المحاسبية">
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                {balanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[#F7F3E8]">
                    {balanced ? 'القيود متوازنة' : 'اختلال في التوازن'}
                  </div>
                  {data.balanceCheck && (
                    <div className="text-[10px] text-[#8C8474] mt-0.5 tabular-nums" dir="ltr">
                      {Number(data.balanceCheck.total_debit).toLocaleString('en-US')} ={' '}
                      {Number(data.balanceCheck.total_credit).toLocaleString('en-US')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(data.stockCheck?.mismatched || 0) === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-[#F7F3E8]">
                    {(data.stockCheck?.mismatched || 0) === 0 ? 'بطاقات الأصناف مطابقة' : 'فرق في بطاقات الأصناف'}
                  </div>
                  <div className="text-[10px] text-[#8C8474] mt-0.5">
                    رصيد كل صنف = مجموع حركات الأذون
                  </div>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-4 justify-center"
              onClick={() => onNavigate('reports')}
            >
              فتح تقرير المطابقة
            </Button>
          </Card>

          <Card title="أعلى رصيد مورد">
            {topSupplier ? (
              <>
                <div className="text-sm font-bold text-[#F7F3E8]">{topSupplier.supplier_name}</div>
                <div className="text-[10px] text-[#7C7565] mt-0.5" dir="ltr">
                  {topSupplier.supplier_id}
                </div>
                <div className="text-lg font-extrabold text-[#E5C158] mt-2 tabular-nums" dir="ltr">
                  {Number(topSupplier.net_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-[10px] text-[#8C8474]">{currency}</span>
                </div>
                <div className="text-[10px] text-[#8C8474] mt-1">
                  افتتاحي {Number(topSupplier.opening_balance).toLocaleString('en-US')} · دائن{' '}
                  {Number(topSupplier.mov_credit).toLocaleString('en-US')} · مدين{' '}
                  {Number(topSupplier.mov_debit).toLocaleString('en-US')}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 px-0"
                  onClick={() => onNavigate('suppliers')}
                >
                  كشوف الموردين ←
                </Button>
              </>
            ) : (
              <div className="text-[11px] text-[#7C7565]">لا موردون مسجّلون</div>
            )}
          </Card>
        </div>
      </div>

      <Card
        title="كيف تُقرأ هذه الأرقام"
        subtitle="مصدر كل رقم هنا هو قاعدة البيانات نفسها، لا حساب مستقل في هذه الصفحة"
      >
        <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-[#A9A292] leading-relaxed">
          <div className="flex gap-2">
            <Wallet className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <b className="text-[#E5C158]">مستحقات الموردين</b> = رصيد حساب الموردين في دفتر الأستاذ، لا
              مجموع ما هو مكتوب في البطاقات.
            </span>
          </div>
          <div className="flex gap-2">
            <Package className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <b className="text-[#E5C158]">قيمة المخزون</b> = كمية كل صنف × تكلفته الحالية. الفرق عن
              حساب المخزون يظهر فوراً في تقرير المطابقة.
            </span>
          </div>
          <div className="flex gap-2">
            <TrendingUp className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <b className="text-[#E5C158]">حد الطلب</b> محسوب من الطلب السنوي ومدة التوريد وحد الأمان —
              وليس رقماً مكتوباً يدوياً.
            </span>
          </div>
        </div>
        <div className="mt-3">
          <Badge tone="gold">نفس محرك النظام المحاسبي الكامل</Badge>
        </div>
      </Card>
    </div>
  );
};
