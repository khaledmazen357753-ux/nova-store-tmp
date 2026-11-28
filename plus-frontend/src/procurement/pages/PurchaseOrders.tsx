import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Money, Num, Badge, Table, Spinner, Notice, Button, Input, Select, Field, today } from './ui';

/**
 * أوامر التوريد (PO).
 *
 * أمر التوريد لا يُحرّك مخزوناً ولا يُنشئ التزاماً محاسبياً — هو التزام
 * تعاقدي فقط. لذلك لا يظهر له قيد يومية، وهذا مقصود لا سهو. الالتزام
 * المالي يظهر لحظة تسجيل فاتورة الشراء.
 */

interface Line {
  item_code: string;
  quantity: number;
  unit_price: number;
}

export const PurchaseOrders: React.FC<{ currency: string; canWrite: boolean; onCreated?: () => void }> = ({
  currency,
  canWrite,
  onCreated,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [header, setHeader] = useState({
    po_date: today(),
    supplier_id: '',
    expected_date: '',
    notes: '',
  });
  const [lines, setLines] = useState<Line[]>([]);

  const load = async () => {
    try {
      const [po, it, sp] = await Promise.all([
        apiFetch('/api/transactions/purchase-orders'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/suppliers'),
      ]);
      setOrders(po.orders || []);
      setItems(it.items || []);
      setSuppliers(sp.suppliers || []);
      if (!header.supplier_id && sp.suppliers?.length) {
        setHeader((h) => ({ ...h, supplier_id: sp.suppliers[0].supplier_id }));
      }
      // الاقتراح الأول: أول صنف تحت حد الطلب — لا صنف عشوائي
      if (lines.length === 0 && it.items?.length) {
        const low = (it.items as any[]).find((x) => Number(x.current_balance) <= Number(x.reorder_point)) || it.items[0];
        setLines([{ item_code: low.item_code, quantity: Number(low.eoq) || 10, unit_price: Number(low.cost_price) }]);
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

  const setLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/transactions/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ ...header, items: lines }),
      });
      setMsg({ tone: 'ok', text: `${res.message} — رقم الأمر ${res.po_no} بقيمة ${Number(res.total_amount).toLocaleString('en-US')} ${currency}` });
      setLines([]);
      setHeader((h) => ({ ...h, notes: '' }));
      await load();
      onCreated?.();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(
    () => ({
      open: orders.filter((o) => o.status === 'قيد التنفيذ'),
      received: orders.filter((o) => o.status === 'تم الاستلام'),
    }),
    [orders]
  );

  const formTotal = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);

  if (loading) return <Spinner label="جارٍ تحميل أوامر التوريد…" />;

  return (
    <div className="space-y-4">
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}

      {canWrite && (
        <Card
          title="إصدار أمر توريد جديد"
          subtitle="أمر التوريد يثبّت الكميات والأسعار المتفق عليها مع المورد قبل وصول البضاعة"
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="تاريخ الأمر">
                <Input type="date" value={header.po_date} onChange={(e) => setHeader({ ...header, po_date: e.target.value })} required />
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
              <Field label="تاريخ التوريد المتوقع">
                <Input type="date" value={header.expected_date} onChange={(e) => setHeader({ ...header, expected_date: e.target.value })} />
              </Field>
              <Field label="ملاحظات">
                <Input value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} placeholder="الغرض من التوريد" />
              </Field>
            </div>

            <Table head={['الصنف', 'الكمية', 'سعر الشراء', 'الإجمالي', '']}>
              {lines.map((l, i) => {
                const item = items.find((x) => x.item_code === l.item_code);
                return (
                  <tr key={i}>
                    <td className="py-2 px-2">
                      <Select
                        value={l.item_code}
                        onChange={(e) => {
                          const found = items.find((x) => x.item_code === e.target.value);
                          setLine(i, { item_code: e.target.value, unit_price: Number(found?.cost_price || 0) });
                        }}
                      >
                        {items.map((it) => (
                          <option key={it.item_code} value={it.item_code}>
                            {it.item_name} — رصيد {it.current_balance} / حد {it.reorder_point}
                          </option>
                        ))}
                      </Select>
                      {item && Number(item.current_balance) <= Number(item.reorder_point) && (
                        <div className="text-[10px] text-red-300 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> تحت حد الطلب — كمية مقترحة {item.eoq}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 w-24">
                      <Input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => setLine(i, { quantity: Number(e.target.value || 1) })}
                      />
                    </td>
                    <td className="py-2 px-2 w-28">
                      <Input
                        type="number"
                        min="0"
                        value={l.unit_price}
                        onChange={(e) => setLine(i, { unit_price: Number(e.target.value || 0) })}
                      />
                    </td>
                    <td className="py-2 px-2 font-bold text-emerald-300 whitespace-nowrap">
                      <Money value={l.quantity * l.unit_price} currency={currency} />
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines([
                    ...lines,
                    { item_code: items[0]?.item_code || '', quantity: Number(items[0]?.eoq) || 10, unit_price: Number(items[0]?.cost_price) || 0 },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" /> إضافة صنف
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm font-extrabold text-emerald-300">
                  إجمالي الأمر: <Money value={formTotal} currency={currency} />
                </span>
                <Button type="submit" disabled={busy || lines.length === 0}>
                  <ClipboardCheck className="w-4 h-4" /> {busy ? 'جارٍ الحفظ…' : 'إصدار الأمر'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Card title={`قيد التنفيذ (${grouped.open.length})`}>
          <div className="space-y-2">
            {grouped.open.length === 0 && <div className="text-[11px] text-[#7C7565] py-3">لا أوامر مفتوحة</div>}
            {grouped.open.map((o) => (
              <button
                key={o.po_no}
                onClick={() => setExpanded(expanded === o.po_no ? null : o.po_no)}
                className="w-full text-right p-3 rounded-xl bg-[#0F0F14] border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#F7F3E8]" dir="ltr">
                    {o.po_no}
                  </span>
                  <Badge tone="gold">{o.status}</Badge>
                </div>
                <div className="text-[11px] text-[#A9A292] mt-1">{o.supplier_name}</div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#7C7565]">
                  <span dir="ltr">{o.po_date}</span>
                  <span className="text-[#E5C158] font-bold">
                    <Money value={o.total_amount} currency={currency} />
                  </span>
                </div>
                {expanded === o.po_no && (
                  <div className="mt-2 pt-2 border-t border-[#D4AF37]/15 space-y-1">
                    {o.items.map((it: any) => (
                      <div key={it.line_no} className="flex justify-between text-[10px]">
                        <span className="text-[#A9A292]">{it.item_name}</span>
                        <span className="tabular-nums" dir="ltr">
                          {it.quantity} × {Number(it.unit_price).toLocaleString('en-US')}
                        </span>
                      </div>
                    ))}
                    {o.notes && <div className="text-[10px] text-[#7C7565] pt-1">{o.notes}</div>}
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card title={`سجل الأوامر المستلمة (${grouped.received.length})`}>
          <Table head={['الأمر', 'المورد', 'التاريخ', 'القيمة']} empty="لا أوامر مستلمة بعد">
            {grouped.received.map((o) => (
              <tr key={o.po_no}>
                <td className="py-2 px-2 text-[10px]" dir="ltr">
                  {o.po_no}
                </td>
                <td className="py-2 px-2 text-[11px]">{o.supplier_name}</td>
                <td className="py-2 px-2 text-[10px]" dir="ltr">
                  {o.po_date}
                </td>
                <td className="py-2 px-2 font-bold">
                  <Num value={o.total_amount} />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card title="ملاحظة محاسبية">
        <p className="text-[11px] text-[#A9A292] leading-relaxed">
          أمر التوريد التزام تعاقدي ولا يُنشئ قيداً محاسبياً ولا يحرّك المخزون. الأثر المالي يبدأ عند تسجيل
          فاتورة الشراء، حيث يُثبت المخزون مديناً وحساب المورد دائناً. ولهذا لا تجد عمود «القيد» في هذه الشاشة —
          ووجوده كان سيكون خطأً.
        </p>
      </Card>
    </div>
  );
};
