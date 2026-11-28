import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Badge, Table, Spinner, Notice, Button, Input, Select, Field, Tabs } from './ui';

/**
 * طلبات التعديل على البيانات الرئيسية.
 *
 * لماذا يوجد هذا كله أصلاً؟ لأن تعديل سعر تكلفة صنف أو رقم هاتف مورد
 * يغيّر كل تقرير لاحق بأثر رجعي — ولا يُنتج قيداً. أي أنه يحدث صامتاً
 * بلا أثر في ميزان المراجعة. لذلك يمرّ عبر طلب يراجعه مدير النظام،
 * ويُسجَّل من قدّمه ومن اعتمده.
 *
 * الأثر الحقيقي: لا تتغيّر القيمة في الجدول قبل الاعتماد. وهذا ما يفحصه
 * `verify-procurement.mjs` قبل وبعد الاعتماد — لا شكل الشاشة.
 */

const ENTITIES = [
  { key: 'suppliers', label: 'الموردون', pk: 'supplier_id', fields: ['supplier_name', 'address', 'city', 'phone', 'email'] },
  { key: 'items', label: 'الأصناف', pk: 'item_code', fields: ['item_name', 'cost_price', 'unit_price', 'reorder_point', 'safety_stock'] },
];

export const ChangeRequestsPage: React.FC<{ user: any }> = ({ user }) => {
  const [tab, setTab] = useState<'new' | 'mine' | 'inbox'>('new');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [entity, setEntity] = useState('suppliers');
  const [entities, setEntities] = useState<Record<string, any[]>>({});
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  const isSuperAdmin = user?.role_code === 'SUPER_ADMIN';
  const spec = ENTITIES.find((e) => e.key === entity)!;

  const loadRequests = async () => {
    try {
      const res = await apiFetch('/api/change-requests');
      setRows(res.requests || []);
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadEntityRows = async (key: string) => {
    if (entities[key]) return;
    try {
      const res = key === 'suppliers' ? await apiFetch('/api/master/suppliers') : await apiFetch('/api/master/items');
      const list = key === 'suppliers' ? res.suppliers : res.items;
      setEntities((e) => ({ ...e, [key]: list || [] }));
      if (list?.length) {
        setTargetId(list[0][key === 'suppliers' ? 'supplier_id' : 'item_code']);
      }
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    setTargetId('');
    setValues({});
    loadEntityRows(entity);
  }, [entity]);

  const current = useMemo(() => {
    const list = entities[entity] || [];
    return list.find((r) => r[spec.pk] === targetId);
  }, [entities, entity, targetId, spec.pk]);

  useEffect(() => {
    if (!current) return;
    const next: Record<string, string> = {};
    for (const f of spec.fields) next[f] = String(current[f] ?? '');
    setValues(next);
  }, [current]);

  const changed = useMemo(() => {
    if (!current) return [];
    return spec.fields.filter((f) => String(current[f] ?? '') !== String(values[f] ?? ''));
  }, [current, values, spec.fields]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of changed) {
        payload[f] = /price|point|stock/.test(f) ? Number(values[f]) : values[f];
      }
      const res = await apiFetch('/api/change-requests', {
        method: 'POST',
        body: JSON.stringify({ entity_type: entity, entity_id: targetId, payload, reason }),
      });
      setMsg({
        tone: 'ok',
        text: `${res.message} — رقم الطلب ${res.request?.change_id}. القيمة الحالية لم تتغيّر بعد؛ تنتظر اعتماد المدير.`,
      });
      setReason('');
      await loadRequests();
      setTab('mine');
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusy(true);
    setMsg(null);
    try {
      const note = action === 'approve' ? 'معتمد بعد التحقق من المستند' : 'مرفوض — البيانات غير مستندة لمستند';
      const res = await apiFetch(`/api/change-requests/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(action === 'approve' ? { note } : { note }),
      });
      setMsg({ tone: 'ok', text: res.message || (action === 'approve' ? 'تم الاعتماد' : 'تم الرفض') });
      // إعادة تحميل الصفوف: القيمة تتغيّر فعلياً في الجدول بعد الاعتماد
      setEntities((e) => ({ ...e, [entity]: undefined as any }));
      await loadRequests();
    } catch (err: any) {
      setMsg({ tone: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const mine = rows.filter((r) => r.requested_by === user?.username);
  const pendingAll = rows.filter((r) => r.status === 'pending');

  const statusBadge = (s: string) =>
    s === 'pending' ? (
      <Badge tone="gold">
        <Clock className="w-2.5 h-2.5 inline mr-1" />
        قيد المراجعة
      </Badge>
    ) : s === 'approved' ? (
      <Badge tone="green">
        <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />
        معتمد
      </Badge>
    ) : (
      <Badge tone="red">
        <XCircle className="w-2.5 h-2.5 inline mr-1" />
        مرفوض
      </Badge>
    );

  const Table_ = ({ list, showActions }: { list: any[]; showActions: boolean }) => (
    <Table head={['الطلب', 'البيانات', 'التغييرات', 'السبب', 'مقدّم الطلب', 'الحالة', ...(showActions ? ['إجراء'] : [])]} empty="لا طلبات">
      {list.map((r) => {
        const payload = JSON.parse(r.payload_json || '{}');
        const before = JSON.parse(r.before_json || '{}');
        return (
          <tr key={r.change_id}>
            <td className="py-2 px-2 text-[10px] font-bold" dir="ltr">
              {r.change_id}
            </td>
            <td className="py-2 px-2">
              <div className="text-[11px] text-[#F7F3E8]">{r.entity_label}</div>
              <div className="text-[10px] text-[#7C7565]">{r.created_at}</div>
            </td>
            <td className="py-2 px-2">
              <div className="space-y-0.5">
                {Object.entries(payload).map(([k, v]) => (
                  <div key={k} className="text-[10px]">
                    <span className="text-[#7C7565]">{k}:</span>{' '}
                    <span className="text-[#8C8474] line-through" dir="ltr">
                      {String(before[k] ?? '—')}
                    </span>{' '}
                    <span className="text-emerald-300" dir="ltr">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </td>
            <td className="py-2 px-2 text-[10px] text-[#A9A292] max-w-[200px]">{r.reason}</td>
            <td className="py-2 px-2 text-[10px]">
              <div className="text-[#F7F3E8]">{r.requested_by_name}</div>
              <div className="text-[#7C7565]">{r.requested_by_role}</div>
            </td>
            <td className="py-2 px-2">{statusBadge(r.status)}</td>
            {showActions && (
              <td className="py-2 px-2">
                {r.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => decide(r.change_id, 'approve')} disabled={busy}>
                      اعتماد
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r.change_id, 'reject')} disabled={busy}>
                      رفض
                    </Button>
                  </div>
                ) : (
                  <span className="text-[10px] text-[#7C7565]">{r.decided_by_name || '—'}</span>
                )}
              </td>
            )}
          </tr>
        );
      })}
    </Table>
  );

  if (loading) return <Spinner label="جارٍ تحميل طلبات التعديل…" />;

  return (
    <div className="space-y-4">
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}

      <Card
        title="لماذا لا تُعدَّل البيانات الرئيسية مباشرة؟"
        subtitle="تعديل التكلفة أو بيانات المورد يغيّر كل تقرير لاحق بأثر رجعي — ولا يُنتج قيداً. لذلك يحتاج اعتماداً صريحاً"
      >
        <div className="flex items-center gap-2 text-[11px] text-[#A9A292]">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
          طلبك لا يغيّر شيئاً الآن. القيمة القديمة تبقى سارية حتى يراجع المدير الطلب ويوافق عليه — وحينها فقط
          يُكتب التغيير في الجدول ويُسجَّل في سجل التدقيق.
        </div>
      </Card>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as any)}
        tabs={[
          { id: 'new' as const, label: 'تقديم طلب', icon: <Send className="w-3.5 h-3.5" /> },
          { id: 'mine' as const, label: `طلباتي (${mine.length})`, icon: <Clock className="w-3.5 h-3.5" /> },
          ...(isSuperAdmin
            ? [{ id: 'inbox' as const, label: `صندوق الاعتماد (${pendingAll.length})`, icon: <ShieldCheck className="w-3.5 h-3.5" /> }]
            : []),
        ]}
      />

      {tab === 'new' && (
        <Card title="طلب تعديل بيانات">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="نوع البيانات">
                <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
                  {ENTITIES.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="السجل">
                <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {(entities[entity] || []).map((r: any) => (
                    <option key={r[spec.pk]} value={r[spec.pk]}>
                      {spec.pk === 'supplier_id' ? r.supplier_name : r.item_name} ({r[spec.pk]})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="سبب التعديل" hint="إلزامي — يُحفظ في سجل التدقيق">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تغيّر سعر المورد بموجب عرض سعر جديد" required />
              </Field>
            </div>

            {current && (
              <>
                <Table head={['الحقل', 'القيمة الحالية', 'القيمة المطلوبة']}>
                  {spec.fields.map((f) => (
                    <tr key={f}>
                      <td className="py-2 px-2 text-[11px] text-[#A9A292]" dir="ltr">
                        {f}
                      </td>
                      <td className="py-2 px-2 text-[11px] text-[#8C8474]" dir="ltr">
                        {String(current[f] ?? '—')}
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={values[f] ?? ''}
                          onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                          className={changed.includes(f) ? 'border-emerald-500/60' : ''}
                          dir="ltr"
                        />
                      </td>
                    </tr>
                  ))}
                </Table>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#8C8474]">
                    {changed.length === 0
                      ? 'لم تعدّل أي حقل بعد — التعديل بمقارنة ما هو مسجّل الآن'
                      : `${changed.length} حقل سيتغيّر بعد الاعتماد`}
                  </span>
                  <Button type="submit" disabled={busy || changed.length === 0 || reason.trim().length < 5}>
                    <Send className="w-4 h-4" /> {busy ? 'جارٍ الإرسال…' : 'إرسال الطلب للمدير'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Card>
      )}

      {tab === 'mine' && (
        <Card title="طلباتي" subtitle="حالة كل طلب وما سيتغيّر فيه — والفرق بين القيمة الحالية والمطلوبة">
          <Table_ list={mine} showActions={false} />
        </Card>
      )}

      {tab === 'inbox' && isSuperAdmin && (
        <Card
          title="صندوق الاعتماد"
          subtitle="الاعتماد يكتب القيمة في الجدول فوراً ويسجّل اسمك في سجل التدقيق — لا رجعة بلا طلب جديد"
        >
          <Table_ list={pendingAll} showActions />
        </Card>
      )}
    </div>
  );
};
