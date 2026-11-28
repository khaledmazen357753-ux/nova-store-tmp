import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Search, TrendingDown, TrendingUp, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Money, Num, Badge, Table, Spinner, Notice, Button, Input, TotalRow } from './ui';

/**
 * الموردون وكشوف حساباتهم.
 *
 * الصفحة تجيب على سؤال واحد: «لمن أدين، وبكم، ومن أين جاء الرقم؟»
 * لذلك كل رصيد هنا يقابله كشف يفتح حركاته قيداً بقيد — لا رقم بلا سند.
 */

interface Supplier {
  supplier_id: string;
  supplier_name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  opening_balance: number;
  mov_debit: number;
  mov_credit: number;
  net_balance: number;
}

export const Suppliers: React.FC<{ currency: string; canWrite: boolean }> = ({ currency, canWrite }) => {
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch('/api/master/suppliers');
      setList(res.suppliers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openLedger = async (s: Supplier) => {
    setSelected(s);
    setLedger(null);
    setLedgerLoading(true);
    try {
      const res = await apiFetch(`/api/reports/purchases?type=supplier-ledger&supplier_id=${s.supplier_id}`);
      setLedger(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.supplier_name.toLowerCase().includes(q) ||
        s.supplier_id.toLowerCase().includes(q) ||
        String(s.city || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  const totals = useMemo(
    () => ({
      opening: filtered.reduce((s, x) => s + Number(x.opening_balance), 0),
      credit: filtered.reduce((s, x) => s + Number(x.mov_credit), 0),
      debit: filtered.reduce((s, x) => s + Number(x.mov_debit), 0),
      net: filtered.reduce((s, x) => s + Number(x.net_balance), 0),
    }),
    [filtered]
  );

  if (loading) return <Spinner label="جارٍ تحميل الموردين وأرصدتهم…" />;

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            ← رجوع لقائمة الموردين
          </Button>
          <Badge tone="gold">{selected.supplier_id}</Badge>
        </div>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-base font-extrabold text-[#F7F3E8]">{selected.supplier_name}</h2>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#A9A292]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#D4AF37]" /> {selected.city} — {selected.address}
                </span>
                <span className="flex items-center gap-1.5" dir="ltr">
                  <Phone className="w-3 h-3 text-[#D4AF37]" /> {selected.phone}
                </span>
                <span className="flex items-center gap-1.5" dir="ltr">
                  <Mail className="w-3 h-3 text-[#D4AF37]" /> {selected.email}
                </span>
              </div>
            </div>
            <div className="text-left">
              <div className="text-[10px] text-[#8C8474]">الرصيد المستحق للمورد</div>
              <div className="text-xl font-extrabold text-[#E5C158] tabular-nums" dir="ltr">
                {Number(selected.net_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                <span className="text-[10px] text-[#8C8474]">{currency}</span>
              </div>
              <div className="text-[10px] text-[#7C7565] mt-1">
                افتتاحي {Number(selected.opening_balance).toLocaleString('en-US')} + فواتير{' '}
                {Number(selected.mov_credit).toLocaleString('en-US')} − سداد ومرتجعات{' '}
                {Number(selected.mov_debit).toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="كشف حساب المورد"
          subtitle="كل حركة مرتبطة بقيد يومية — الرصيد الجاري محسوب من الحركة نفسها لا مُدخل يدوياً"
        >
          {ledgerLoading ? (
            <Spinner label="جارٍ بناء كشف الحساب…" />
          ) : ledger ? (
            <>
              <Table head={['التاريخ', 'المستند', 'البيان', 'مدين', 'دائن', 'الرصيد الجاري', 'القيد']}>
                <tr className="bg-[#D4AF37]/5">
                  <td className="py-2 px-2 text-[#8C8474]">—</td>
                  <td className="py-2 px-2" colSpan={3}>
                    <span className="text-[11px] text-[#A9A292]">رصيد افتتاحي مُعتمد</span>
                  </td>
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2 font-bold text-[#E5C158]">
                    <Money value={ledger.opening_balance} currency={currency} />
                  </td>
                  <td className="py-2 px-2" />
                </tr>
                {ledger.rows?.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-[#D4AF37]/5">
                    <td className="py-2 px-2 whitespace-nowrap" dir="ltr">
                      {r.tx_date}
                    </td>
                    <td className="py-2 px-2" dir="ltr">
                      {r.doc_no}
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-[11px] text-[#F7F3E8]">{r.tx_type}</div>
                      <div className="text-[10px] text-[#7C7565]">{r.notes}</div>
                    </td>
                    <td className="py-2 px-2 text-emerald-300">
                      {Number(r.debit) > 0 ? <Num value={r.debit} /> : '—'}
                    </td>
                    <td className="py-2 px-2 text-amber-300">
                      {Number(r.credit) > 0 ? <Num value={r.credit} /> : '—'}
                    </td>
                    <td className="py-2 px-2 font-bold">
                      <Num value={r.running_balance} />
                    </td>
                    <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                      {r.journal_entry_number || '—'}
                    </td>
                  </tr>
                ))}
              </Table>
              <TotalRow label="الرصيد الختامي">
                <Money value={ledger.closing_balance} currency={currency} />
              </TotalRow>
            </>
          ) : (
            <Notice tone="err">تعذّر بناء كشف الحساب</Notice>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Notice tone="err" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282]">إجمالي المستحق للموردين</div>
          <div className="text-lg font-extrabold text-[#E5C158] mt-1.5">
            <Money value={totals.net} currency={currency} />
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282]">الأرصدة الافتتاحية</div>
          <div className="text-lg font-extrabold text-[#F7F3E8] mt-1.5">
            <Money value={totals.opening} currency={currency} />
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282] flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-amber-400" /> مشتريات دائنة
          </div>
          <div className="text-lg font-extrabold text-amber-300 mt-1.5">
            <Money value={totals.credit} currency={currency} />
          </div>
        </div>
        <div className="royal-card rounded-2xl p-4">
          <div className="text-[11px] text-[#9A9282] flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3 text-emerald-400" /> سداد ومرتجعات
          </div>
          <div className="text-lg font-extrabold text-emerald-300 mt-1.5">
            <Money value={totals.debit} currency={currency} />
          </div>
        </div>
      </div>

      <Card
        title={`الموردون (${filtered.length})`}
        subtitle="اضغط على أي مورد لعرض كشف حسابه الكامل بالحركات والقيود"
        actions={
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C8474] absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو المدينة"
              className="pr-8 w-56"
            />
          </div>
        }
      >
        <Table head={['الكود', 'المورد', 'المدينة', 'الهاتف', 'افتتاحي', 'مشتريات', 'سداد', 'الرصيد', '']} empty="لا نتائج">
          {filtered.map((s) => (
            <tr key={s.supplier_id} className="hover:bg-[#D4AF37]/5 cursor-pointer" onClick={() => openLedger(s)}>
              <td className="py-2 px-2 text-[10px] text-[#8C8474]" dir="ltr">
                {s.supplier_id}
              </td>
              <td className="py-2 px-2">
                <div className="font-bold text-[#F7F3E8]">{s.supplier_name}</div>
                <div className="text-[10px] text-[#7C7565]" dir="ltr">
                  {s.email}
                </div>
              </td>
              <td className="py-2 px-2 text-[11px]">{s.city}</td>
              <td className="py-2 px-2 text-[11px]" dir="ltr">
                {s.phone}
              </td>
              <td className="py-2 px-2">
                <Num value={s.opening_balance} />
              </td>
              <td className="py-2 px-2 text-amber-300">
                <Num value={s.mov_credit} />
              </td>
              <td className="py-2 px-2 text-emerald-300">
                <Num value={s.mov_debit} />
              </td>
              <td className="py-2 px-2 font-extrabold text-[#E5C158]">
                <Num value={s.net_balance} />
              </td>
              <td className="py-2 px-2">
                <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
              </td>
            </tr>
          ))}
        </Table>
        <TotalRow label="الإجمالي">
          <Money value={totals.net} currency={currency} />
        </TotalRow>
      </Card>

      {!canWrite && (
        <div className="text-[10px] text-[#7C7565]">
          أنت في وضع العرض فقط — لا يمكن إضافة أو تعديل بيانات من هذا التبويب.
        </div>
      )}
    </div>
  );
};
