import React, { useEffect, useState } from 'react';
import { Clock, Calculator } from 'lucide-react';
import { apiFetch, fmtMoney, todayIso } from '../lib/api';
import { PlusSpinner } from '../components/BrandIdentity';

export const HRModule: React.FC<{ currency?: string }> = ({ currency = 'ج.م' }) => {
  const [tab, setTab] = useState<'attendance' | 'payroll'>('payroll');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);

  const [attForm, setAttForm] = useState({
    employee_code: 'EMP-001',
    att_date: todayIso(),
    check_in: '08:30',
    check_out: '16:30',
    status: 'حاضر',
    late_minutes: 0,
    overtime_hours: 0,
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    month: 11,
    year: 2026,
    employee_code: '', // فارغ = جميع الموظفين
    incentives: 500,
    extra_deductions: 0,
    payment_method: 'نقدي',
    bank_account_number: '',
  });

  const loadHR = async () => {
    setLoading(true);
    try {
      const [eRes, bRes, aRes, pRes] = await Promise.all([
        apiFetch('/api/master/employees'),
        apiFetch('/api/master/banks'),
        apiFetch('/api/transactions/attendance'),
        apiFetch('/api/transactions/payrolls'),
      ]);
      setEmployees(eRes.employees || []);
      setBanks(bRes.banks || []);
      setAttendance(aRes.records || []);
      setPayrolls(pRes.payrolls || []);
      if (bRes.banks?.length && !payForm.bank_account_number) {
        setPayForm((p) => ({ ...p, bank_account_number: bRes.banks[0].bank_account_number }));
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHR();
  }, []);

  if (loading) return <PlusSpinner label="جارٍ تحميل سجلات الحضور ومسير الأجور والمستحقات..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setTab('payroll'); setMsg(null); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            tab === 'payroll' ? 'gold-metallic-btn' : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>احتساب المستحقات الشهرية والأجور</span>
        </button>
        <button
          onClick={() => { setTab('attendance'); setMsg(null); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            tab === 'attendance' ? 'gold-metallic-btn' : 'bg-[#111116] text-[#D7CEB8] border border-[#D4AF37]/25'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>تسجيل الحضور والانصراف اليومي</span>
        </button>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl text-sm border ${
          msg.type === 'ok' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' : 'bg-red-950/60 border-red-500/50 text-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      {tab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch('/api/transactions/payrolls/generate', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...payForm,
                    employee_code: payForm.employee_code || null,
                  }),
                });
                setMsg({ type: 'ok', text: `${res.message} — إجمالي الصافي المنصرف: ${fmtMoney(res.total_net, currency)}` });
                loadHR();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">احتساب وصرف المستحقات الشهرية</h3>
            <p className="text-[11px] text-[#A8A08C]">
              يجمع النظام الراتب الأساسي + البدلات + الحوافز + الساعات الإضافية ويخصم جزاءات الغياب والتأخير تلقائياً مع توليد قيد اليومية.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">الشهر</label>
                <input type="number" min="1" max="12" value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">السنة</label>
                <input type="number" value={payForm.year} onChange={(e) => setPayForm({ ...payForm, year: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#B5AD99]">نطاق الاحتساب</label>
              <select value={payForm.employee_code} onChange={(e) => setPayForm({ ...payForm, employee_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                <option value="">جميع العاملين النشطين دفعة واحدة</option>
                {employees.map((emp) => <option key={emp.employee_code} value={emp.employee_code}>{emp.employee_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">حوافز الشهر</label>
                <input type="number" min="0" value={payForm.incentives} onChange={(e) => setPayForm({ ...payForm, incentives: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">استقطاعات إضافية</label>
                <input type="number" min="0" value={payForm.extra_deductions} onChange={(e) => setPayForm({ ...payForm, extra_deductions: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              <option value="نقدي">صرف نقدي من الخزينة</option>
              <option value="تحويل بنكي">تحويل رواتب بنكي</option>
            </select>
            {payForm.payment_method !== 'نقدي' && (
              <select value={payForm.bank_account_number} onChange={(e) => setPayForm({ ...payForm, bank_account_number: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
                {banks.map((b) => <option key={b.bank_account_number} value={b.bank_account_number}>{b.bank_name}</option>)}
              </select>
            )}
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">
              احتساب واعتماد مسير الرواتب
            </button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">كشف المستحقات الشهرية للعاملين</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">الفترة</th>
                  <th className="py-2 px-2">الموظف</th>
                  <th className="py-2 px-2">الأساسي</th>
                  <th className="py-2 px-2">البدلات</th>
                  <th className="py-2 px-2">حوافز + إضافي</th>
                  <th className="py-2 px-2">الاستقطاعات</th>
                  <th className="py-2 px-2">صافي المستحق</th>
                  <th className="py-2 px-2">القيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {payrolls.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-2 font-mono text-[#E5C158]">{p.month}/{p.year}</td>
                    <td className="py-2.5 px-2 font-bold">{p.employee_name}</td>
                    <td className="py-2.5 px-2">{fmtMoney(p.basic_salary, currency)}</td>
                    <td className="py-2.5 px-2">{fmtMoney(p.allowances, currency)}</td>
                    <td className="py-2.5 px-2 text-emerald-300">{fmtMoney(p.incentives + p.overtime_pay, currency)}</td>
                    <td className="py-2.5 px-2 text-red-300">{fmtMoney(p.deductions, currency)}</td>
                    <td className="py-2.5 px-2 font-extrabold text-[#FCE79C]">{fmtMoney(p.net_salary, currency)}</td>
                    <td className="py-2.5 px-2 font-mono text-[#B5AD99]">{p.journal_entry_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch('/api/transactions/attendance', { method: 'POST', body: JSON.stringify(attForm) });
                setMsg({ type: 'ok', text: 'تم تسجيل حركة الحضور والانصراف اليومي بنجاح' });
                loadHR();
              } catch (err: any) {
                setMsg({ type: 'err', text: err.message });
              }
            }}
            className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-bold gold-gradient-text">تسجيل حضور وانصراف يومي</h3>
            <select value={attForm.employee_code} onChange={(e) => setAttForm({ ...attForm, employee_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs">
              {employees.map((emp) => <option key={emp.employee_code} value={emp.employee_code}>{emp.employee_name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={attForm.att_date} onChange={(e) => setAttForm({ ...attForm, att_date: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs" />
              <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })} className="gold-input rounded-xl px-3 py-2 text-xs">
                <option value="حاضر">حاضر</option>
                <option value="تأخير">تأخير</option>
                <option value="غائب">غائب</option>
                <option value="إجازة">إجازة</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">وقت الحضور</label>
                <input type="time" value={attForm.check_in} onChange={(e) => setAttForm({ ...attForm, check_in: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">وقت الانصراف</label>
                <input type="time" value={attForm.check_out} onChange={(e) => setAttForm({ ...attForm, check_out: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#B5AD99]">دقائق التأخير</label>
                <input type="number" min="0" value={attForm.late_minutes} onChange={(e) => setAttForm({ ...attForm, late_minutes: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[#B5AD99]">ساعات إضافية</label>
                <input type="number" min="0" step="0.5" value={attForm.overtime_hours} onChange={(e) => setAttForm({ ...attForm, overtime_hours: Number(e.target.value) })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1" />
              </div>
            </div>
            <input placeholder="ملاحظات" value={attForm.notes} onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
            <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">حفظ السجل اليومي</button>
          </form>

          <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل الحضور والانصراف اليومي</h3>
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">الموظف</th>
                  <th className="py-2 px-2">الحضور</th>
                  <th className="py-2 px-2">الانصراف</th>
                  <th className="py-2 px-2">الحالة</th>
                  <th className="py-2 px-2">تأخير (د)</th>
                  <th className="py-2 px-2">إضافي (س)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10 tabular-nums">
                {attendance.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-2">{r.att_date}</td>
                    <td className="py-2.5 px-2 font-bold">{r.employee_name}</td>
                    <td className="py-2.5 px-2 font-mono">{r.check_in}</td>
                    <td className="py-2.5 px-2 font-mono">{r.check_out}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        r.status === 'حاضر' ? 'bg-emerald-500/20 text-emerald-300' : r.status === 'غائب' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-2">{r.late_minutes}</td>
                    <td className="py-2.5 px-2 text-emerald-300">{r.overtime_hours}</td>
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
