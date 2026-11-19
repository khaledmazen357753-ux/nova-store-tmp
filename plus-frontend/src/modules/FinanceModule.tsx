import React, { useEffect, useState } from 'react';
import { FolderTree, BookOpen, Banknote, Plus, Trash2, AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft } from 'lucide-react';
import { apiFetch, fmtMoney, todayIso } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

type FinanceTab = 'coa' | 'journal' | 'vouchers';

export const FinanceModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<FinanceTab>('journal');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [tree, setTree] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [expandedMain, setExpandedMain] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': true, '4': true });

  // نماذج إضافة دليل الحسابات (3 مستويات)
  const [subForm, setSubForm] = useState({ sub_group_code: '', sub_group_name: '', main_group_code: '1' });
  const [accForm, setAccForm] = useState({ account_code: '', account_name: '', sub_group_code: '11', opening_debit: 0, opening_credit: 0 });

  // شاشة تسجيل قيد اليومية
  const [jeDate, setJeDate] = useState(todayIso());
  const [jeDesc, setJeDesc] = useState('');
  const [jeLines, setJeLines] = useState([
    { account_code: '3202', debit: 0, credit: 0, notes: '' },
    { account_code: '1101', debit: 0, credit: 0, notes: '' },
  ]);

  // شاشة إثبات المتحصلات والمدفوعات النقدية وبالشيكات
  const [vForm, setVForm] = useState({
    voucher_type: 'receipt',
    payment_method: 'نقدي',
    voucher_date: todayIso(),
    amount: 5000,
    account_code: '4201',
    bank_account_number: '',
    check_number: '',
    check_due_date: '',
    beneficiary_name: '',
    notes: '',
  });

  const loadFinance = async () => {
    setLoading(true);
    try {
      const [coaRes, jeRes, vRes, bRes] = await Promise.all([
        apiFetch('/api/master/accounts-tree'),
        apiFetch('/api/transactions/journal-entries'),
        apiFetch('/api/transactions/treasury-vouchers'),
        apiFetch('/api/master/banks'),
      ]);
      setTree(coaRes.tree || []);
      setSubGroups(coaRes.subGroups || []);
      setAccounts(coaRes.accounts || []);
      setEntries(jeRes.entries || []);
      setVouchers(vRes.vouchers || []);
      setBanks(bRes.banks || []);
      if (bRes.banks?.length && !vForm.bank_account_number) {
        setVForm((prev) => ({ ...prev, bank_account_number: bRes.banks[0].bank_account_number }));
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const totalDebit = Math.round(jeLines.reduce((s, l) => s + Number(l.debit || 0), 0) * 100) / 100;
  const totalCredit = Math.round(jeLines.reduce((s, l) => s + Number(l.credit || 0), 0) * 100) / 100;
  const diff = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
  const isBalanced = totalDebit > 0 && diff < 0.01;

  const submitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setMsg({
        type: 'err',
        text: `تحذير التوازن المحاسبي: يمنع النظام حفظ القيد لأن إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}) — الفارق (${diff.toFixed(2)}).`,
      });
      return;
    }
    try {
      const res = await apiFetch('/api/transactions/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: jeDate,
          description: jeDesc,
          lines: jeLines,
        }),
      });
      setMsg({ type: 'ok', text: `${res.message} — رقم القيد: ${res.entry.entry_number}` });
      setJeDesc('');
      setJeLines([
        { account_code: '3202', debit: 0, credit: 0, notes: '' },
        { account_code: '1101', debit: 0, credit: 0, notes: '' },
      ]);
      loadFinance();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    }
  };

  if (loading) return <PlusSpinner label="جارٍ تحميل الدليل المحاسبي الشجري ودفتر اليومية..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'journal', label: 'تسجيل قيود اليومية العامة', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'coa', label: 'دليل الحسابات الشجري (3 مستويات)', icon: <FolderTree className="w-4 h-4" /> },
          { id: 'vouchers', label: 'المتحصلات والمدفوعات النقدية وبالشيكات', icon: <Banknote className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as FinanceTab); setMsg(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
              tab === t.id ? 'gold-metallic-btn' : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25 hover:border-[#D4AF37]/60'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm border flex items-center gap-2.5 ${
          msg.type === 'ok' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' : 'bg-red-950/60 border-red-500/50 text-red-200'
        }`}>
          {msg.type === 'err' ? <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 1. شاشة تسجيل قيود اليومية */}
      {tab === 'journal' && (
        <div className="space-y-6">
          <form onSubmit={submitJournal} className="royal-card rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3">
              <div>
                <h3 className="text-base font-bold gold-gradient-text">شاشة تسجيل قيد يومية مزدوج (رأس القيد + تفاصيل القيد)</h3>
                <p className="text-xs text-[#A8A08C]">يتحقق النظام لحظياً من تساوي إجمالي الطرف المدين مع إجمالي الطرف الدائن قبل السماح بالترحيل</p>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                isBalanced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
              }`}>
                {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {isBalanced ? 'القيد متوازن وجاهز للحفظ' : totalDebit === 0 && totalCredit === 0 ? 'أدخل مبالغ القيد' : `غير متوازن — الفارق: ${diff.toFixed(2)}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#C7BFA9]">تاريخ القيد</label>
                <input type="date" value={jeDate} onChange={(e) => setJeDate(e.target.value)} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" required />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[#C7BFA9]">البيان العام / شرح القيد</label>
                <input
                  placeholder="مثال: إثبات سداد مصروفات صيانة دورية للمقر الإداري..."
                  value={jeDesc}
                  onChange={(e) => setJeDesc(e.target.value)}
                  className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                    <th className="py-2 px-2 w-12">#</th>
                    <th className="py-2 px-2">الحساب (من دليل الحسابات)</th>
                    <th className="py-2 px-2 w-36">مدين ({currency})</th>
                    <th className="py-2 px-2 w-36">دائن ({currency})</th>
                    <th className="py-2 px-2">ملاحظات السطر</th>
                    <th className="py-2 px-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {jeLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-mono text-[#A8A08C]">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <select
                          value={line.account_code}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].account_code = e.target.value;
                            setJeLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        >
                          {accounts.map((a) => (
                            <option key={a.account_code} value={a.account_code}>
                              {a.account_code} — {a.account_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit || ''}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = Number(e.target.value || 0);
                            const copy = [...jeLines];
                            copy[idx].debit = val;
                            if (val > 0) copy[idx].credit = 0;
                            setJeLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit || ''}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = Number(e.target.value || 0);
                            const copy = [...jeLines];
                            copy[idx].credit = val;
                            if (val > 0) copy[idx].debit = 0;
                            setJeLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          value={line.notes}
                          placeholder="إيضاح السطر..."
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].notes = e.target.value;
                            setJeLines(copy);
                          }}
                          className="w-full gold-input rounded-lg px-2.5 py-2 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {jeLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setJeLines(jeLines.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D4AF37]/40 font-bold text-sm tabular-nums bg-[#0B0B10]">
                    <td colSpan={2} className="py-3 px-3 text-[#E5C158]">إجمالي طرفي القيد</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtMoney(totalDebit, currency)}</td>
                    <td className="py-3 px-2 text-emerald-300">{fmtMoney(totalCredit, currency)}</td>
                    <td colSpan={2} className="py-3 px-2 text-xs">
                      {diff > 0 && (
                        <span className="text-red-400">تحذير: القيد غير متوازن بفارق {fmtMoney(diff, currency)}</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJeLines([...jeLines, { account_code: accounts[0]?.account_code || '1101', debit: 0, credit: 0, notes: '' }])}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#15151C] border border-[#D4AF37]/35 text-[#E5C158] hover:border-[#D4AF37] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> إضافة طرف جديد للقيد
              </button>

              <button type="submit" className="gold-metallic-btn px-6 py-2.5 rounded-xl text-xs cursor-pointer">
                حفظ وترحيل القيد لدفتر اليومية العام
              </button>
            </div>
          </form>

          {/* سجل قيود اليومية */}
          <div className="royal-card rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#FAF5E8]">سجل قيود اليومية المسجلة ({entries.length})</h3>
            <div className="space-y-3">
              {entries.map((je) => (
                <div key={je.entry_number} className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#D4AF37]/15">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#FCE79C] font-mono text-xs font-bold">
                        {je.entry_number}
                      </span>
                      <span className="text-xs text-[#B5AD99]">{je.entry_date}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#191922] text-[#C8C0AC]">
                        {je.reference_type}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-300 tabular-nums">
                      إجمالي متوازن: {fmtMoney(je.total_debit, currency)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#F3EDE0] mb-2">{je.description}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-right tabular-nums">
                      <thead>
                        <tr className="text-[#9E9682]">
                          <th className="py-1 px-2">كود الحساب</th>
                          <th className="py-1 px-2">اسم الحساب</th>
                          <th className="py-1 px-2">مدين</th>
                          <th className="py-1 px-2">دائن</th>
                          <th className="py-1 px-2">البيان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {je.lines.map((l: any) => (
                          <tr key={l.id} className="border-t border-white/5">
                            <td className="py-1 px-2 font-mono text-[#E5C158]">{l.account_code}</td>
                            <td className="py-1 px-2">{l.account_name}</td>
                            <td className="py-1 px-2 text-emerald-300">{l.debit > 0 ? fmtMoney(l.debit, currency) : '—'}</td>
                            <td className="py-1 px-2 text-amber-300">{l.credit > 0 ? fmtMoney(l.credit, currency) : '—'}</td>
                            <td className="py-1 px-2 text-[#A8A08C]">{l.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. دليل الحسابات الشجري (3 مستويات) */}
      {tab === 'coa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch('/api/master/account-sub-groups', { method: 'POST', body: JSON.stringify(subForm) });
                  setMsg({ type: 'ok', text: 'تمت إضافة المجموعة الفرعية (المستوى الثاني) بنجاح' });
                  setSubForm({ sub_group_code: '', sub_group_name: '', main_group_code: '1' });
                  loadFinance();
                } catch (err: any) {
                  setMsg({ type: 'err', text: err.message });
                }
              }}
              className="royal-card rounded-2xl p-4 space-y-3"
            >
              <h3 className="text-xs font-bold gold-gradient-text">إضافة مجموعة فرعية (المستوى الثاني)</h3>
              <select value={subForm.main_group_code} onChange={(e) => setSubForm({ ...subForm, main_group_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                {tree.map((m) => <option key={m.main_group_code} value={m.main_group_code}>{m.main_group_code} - {m.group_name}</option>)}
              </select>
              <input placeholder="كود المجموعة الفرعية (مثال: 13)" value={subForm.sub_group_code} onChange={(e) => setSubForm({ ...subForm, sub_group_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
              <input placeholder="اسم المجموعة الفرعية" value={subForm.sub_group_name} onChange={(e) => setSubForm({ ...subForm, sub_group_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
              <button type="submit" className="w-full gold-metallic-btn py-2 rounded-xl text-xs cursor-pointer">حفظ المجموعة الفرعية</button>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch('/api/master/accounts', { method: 'POST', body: JSON.stringify(accForm) });
                  setMsg({ type: 'ok', text: 'تمت إضافة الحساب الفرعي (المستوى الثالث) بنجاح' });
                  setAccForm({ account_code: '', account_name: '', sub_group_code: '11', opening_debit: 0, opening_credit: 0 });
                  loadFinance();
                } catch (err: any) {
                  setMsg({ type: 'err', text: err.message });
                }
              }}
              className="royal-card rounded-2xl p-4 space-y-3"
            >
              <h3 className="text-xs font-bold gold-gradient-text">إضافة حساب جديد (المستوى الثالث)</h3>
              <select value={accForm.sub_group_code} onChange={(e) => setAccForm({ ...accForm, sub_group_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                {subGroups.map((s) => <option key={s.sub_group_code} value={s.sub_group_code}>{s.sub_group_code} - {s.sub_group_name}</option>)}
              </select>
              <input placeholder="كود الحساب (مثال: 1106)" value={accForm.account_code} onChange={(e) => setAccForm({ ...accForm, account_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
              <input placeholder="اسم الحساب" value={accForm.account_name} onChange={(e) => setAccForm({ ...accForm, account_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
              <button type="submit" className="w-full gold-metallic-btn py-2 rounded-xl text-xs cursor-pointer">إدراج في الدليل الشجري</button>
            </form>
          </div>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold gold-gradient-text mb-2">دليل الحسابات الشجري التفاعلي (3 مستويات: رئيسي ← فرعي ← حساب)</h3>
            {tree.map((mg) => {
              const isOpen = expandedMain[mg.main_group_code] ?? true;
              return (
                <div key={mg.main_group_code} className="rounded-xl border border-[#D4AF37]/30 overflow-hidden bg-[#0B0B10]">
                  <button
                    type="button"
                    onClick={() => setExpandedMain({ ...expandedMain, [mg.main_group_code]: !isOpen })}
                    className="w-full px-4 py-3 flex items-center justify-between bg-[#15141C] hover:bg-[#1B1924] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-[#D4AF37]" /> : <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />}
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#FCE79C]">{mg.main_group_code}</span>
                      <span className="text-sm font-extrabold text-[#FAF5E8]">{mg.group_name}</span>
                      <span className="text-[11px] text-[#A8A08C]">({mg.account_nature === 'debit' ? 'طبيعة مدينة' : 'طبيعة دائنة'})</span>
                    </div>
                    <span className="text-xs font-bold text-[#E5C158] tabular-nums">{fmtMoney(mg.main_balance, currency)}</span>
                  </button>

                  {isOpen && (
                    <div className="p-3 space-y-3">
                      {mg.sub_groups.map((sg: any) => (
                        <div key={sg.sub_group_code} className="pr-4 border-r-2 border-[#D4AF37]/40 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-[#E5C86B]">
                            <span>[{sg.sub_group_code}] {sg.sub_group_name}</span>
                            <span className="tabular-nums">{fmtMoney(sg.sub_balance, currency)}</span>
                          </div>
                          <div className="space-y-1 pr-3">
                            {sg.accounts.map((acc: any) => (
                              <div key={acc.account_code} className="py-1.5 px-3 rounded-lg bg-[#121219] flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[#D4AF37]">{acc.account_code}</span>
                                  <span className="text-[#F2ECE0]">{acc.account_name}</span>
                                </div>
                                <span className="font-semibold text-emerald-300 tabular-nums">
                                  {fmtMoney(acc.net_balance, currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. شاشة إثبات المتحصلات والمدفوعات النقدية وبالشيكات */}
      {tab === 'vouchers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/treasury-vouchers', {
                  method: 'POST',
                  body: JSON.stringify(vForm),
                });
                setMsg({ type: 'ok', text: `${res.message} — رقم السند: ${res.voucher_no}` });
                setVForm({ ...vForm, beneficiary_name: '', notes: '', check_number: '' });
                loadFinance();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">إثبات سند قبض (متحصلات) أو سند صرف (مدفوعات)</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVForm({ ...vForm, voucher_type: 'receipt' })}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  vForm.voucher_type === 'receipt' ? 'bg-emerald-600 text-white' : 'bg-[#121218] text-[#B5AD99]'
                }`}
              >
                سند قبض (متحصلات)
              </button>
              <button
                type="button"
                onClick={() => setVForm({ ...vForm, voucher_type: 'payment' })}
                className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  vForm.voucher_type === 'payment' ? 'bg-amber-600 text-black' : 'bg-[#121218] text-[#B5AD99]'
                }`}
              >
                سند صرف (مدفوعات)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">طريقة الدفع</label>
                <select value={vForm.payment_method} onChange={(e) => setVForm({ ...vForm, payment_method: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                  <option value="نقدي">نقدي (الخزينة)</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">التاريخ</label>
                <input type="date" value={vForm.voucher_date} onChange={(e) => setVForm({ ...vForm, voucher_date: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>

            {vForm.payment_method !== 'نقدي' && (
              <div className="space-y-2 p-3 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/25">
                <label className="text-[11px] text-[#E5C158]">الحساب البنكي المسحوب عليه / المودع به</label>
                <select value={vForm.bank_account_number} onChange={(e) => setVForm({ ...vForm, bank_account_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                  {banks.map((b) => <option key={b.bank_account_number} value={b.bank_account_number}>{b.bank_name} ({b.branch})</option>)}
                </select>
                {vForm.payment_method === 'شيك' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="رقم الشيك" value={vForm.check_number} onChange={(e) => setVForm({ ...vForm, check_number: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
                    <input type="date" value={vForm.check_due_date} onChange={(e) => setVForm({ ...vForm, check_due_date: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] text-[#B5AD99]">الحساب المالي المقابل</label>
              <select value={vForm.account_code} onChange={(e) => setVForm({ ...vForm, account_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                {accounts.map((a) => <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#B5AD99]">المبلغ ({currency})</label>
              <input type="number" min="1" step="0.01" value={vForm.amount} onChange={(e) => setVForm({ ...vForm, amount: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" required />
            </div>

            <input placeholder="اسم المستفيد / المودِع" value={vForm.beneficiary_name} onChange={(e) => setVForm({ ...vForm, beneficiary_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
            <input placeholder="البيان والملاحظات" value={vForm.notes} onChange={(e) => setVForm({ ...vForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />

            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">
              حفظ السند وترحيل القيد المحاسبي
            </button>
          </form>

          <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل سندات المتحصلات والمدفوعات النقدية والشيكات</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">رقم السند</th>
                  <th className="py-2 px-2">النوع</th>
                  <th className="py-2 px-2">الطريقة</th>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">الطرف / الحساب</th>
                  <th className="py-2 px-2">المبلغ</th>
                  <th className="py-2 px-2">القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {vouchers.map((v) => (
                  <tr key={v.voucher_no}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{v.voucher_no}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        v.voucher_type === 'receipt' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {v.voucher_type === 'receipt' ? 'قبض' : 'صرف'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">{v.payment_method} {v.check_number ? `(${v.check_number})` : ''}</td>
                    <td className="py-2.5 px-2">{v.voucher_date}</td>
                    <td className="py-2.5 px-2">{v.beneficiary_name || v.account_name}</td>
                    <td className="py-2.5 px-2 font-bold">{fmtMoney(v.amount, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{v.journal_entry_number}</td>
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
