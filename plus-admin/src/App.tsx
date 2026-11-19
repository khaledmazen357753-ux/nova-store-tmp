import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  KeyRound,
  CalendarClock,
  Database,
  Globe,
  Activity,
  LogOut,
  CheckCircle2,
  Download,
  RefreshCw,
  Lock,
  UserPlus,
  Save,
  Crown,
} from 'lucide-react';
import { adminFetch, downloadTextFile, getAdminToken, getApiBaseUrl, setAdminToken, setCustomApiBaseUrl } from './api';
import { PlusCrossEmblem, PlusSpinner, PlusWatermark, RoyalCrownSvg } from './components/BrandIdentity';

type AdminTab = 'overview' | 'users' | 'roles' | 'fiscal' | 'schema' | 'domains';

const MODULE_LABELS: Record<string, string> = {
  master: '1. وحدة البيانات الأساسية',
  finance: '2. وحدة الإدارة المالية',
  sales: '3. وحدة المبيعات والعملاء',
  purchases: '4. وحدة المشتريات والموردين',
  inventory: '5. وحدة المخزون السلعي',
  hr: '6. وحدة الموارد البشرية',
};

const ACTION_LABELS: { key: string; label: string }[] = [
  { key: 'view', label: 'استعراض' },
  { key: 'add', label: 'إدخال / إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'reports', label: 'عرض التقارير' },
];

export const App: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [tabSwitching, setTabSwitching] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [flashMsg, setFlashMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // بيانات بوابة المدير
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState('SALES_ACCOUNTANT');
  const [periods, setPeriods] = useState<any[]>([]);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState('accounts');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [domainForm, setDomainForm] = useState<any>({});

  // تسجيل الدخول لبوابة المدير
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginErr, setLoginErr] = useState('');
  const [needsApiUrl, setNeedsApiUrl] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());

  // إنشاء مستخدم جديد
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_code: 'SALES_ACCOUNTANT',
    is_admin_portal_allowed: false,
  });

  const notify = (type: 'ok' | 'err', text: string) => {
    setFlashMsg({ type, text });
    setTimeout(() => setFlashMsg(null), 5500);
  };

  const loadAllAdminData = async () => {
    const [ov, us, rl, fp, sc, lg] = await Promise.all([
      adminFetch('/api/admin/overview'),
      adminFetch('/api/admin/users'),
      adminFetch('/api/admin/roles'),
      adminFetch('/api/admin/fiscal-periods'),
      adminFetch('/api/admin/schema'),
      adminFetch('/api/admin/audit-logs'),
    ]);
    setOverview(ov);
    setDomainForm(ov.company || {});
    setUsers(us.users || []);
    setRoles(rl.roles || []);
    setPeriods(fp.periods || []);
    setSchemaData(sc);
    setAuditLogs(lg.logs || []);
  };

  useEffect(() => {
    const init = async () => {
      const minWait = new Promise((r) => setTimeout(r, 850));
      try {
        if (getAdminToken()) {
          const me = await adminFetch('/api/auth/me');
          if (me.user.is_admin_portal_allowed || me.user.role_code === 'SUPER_ADMIN') {
            await loadAllAdminData();
            await minWait;
            setAdminUser(me.user);
            setBooting(false);
            return;
          }
        }
        // دخول تلقائي سلس لمدير النظام عند فتح المعاينة مع إمكانية الخروج وتبديل الحساب
        const login = await adminFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'admin', password: 'admin123', portal: 'ADMIN' }),
        });
        setAdminToken(login.token);
        await loadAllAdminData();
        await minWait;
        setAdminUser(login.user);
      } catch {
        setAdminToken(null);
        adminFetch('/api/health').catch(() => setNeedsApiUrl(true));
      } finally {
        setBooting(false);
      }
    };
    init();
  }, []);

  const switchTab = (next: AdminTab) => {
    if (next === tab) return;
    setTabSwitching(true);
    setTab(next);
    setTimeout(() => setTabSwitching(false), 300);
  };

  if (booting) {
    return (
      <PlusSpinner
        fullScreen
        size={92}
        label="بوابة مدير النظام (Plus Administrator) — جارٍ فحص الصلاحيات ومخطط البيانات..."
      />
    );
  }

  // شاشة دخول مستقلة خاصة بمدير النظام فقط
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#040406] relative flex items-center justify-center p-4">
        <PlusWatermark />
        <div className="relative z-10 w-full max-w-md royal-card royal-double-frame rounded-2xl p-8 space-y-5 text-center">
          <div className="flex flex-col items-center">
            <RoyalCrownSvg size={44} className="mb-1" />
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.3)] mb-3">
              <img src="/plus-logo.jpeg" alt="Plus Administrator" className="w-full h-full object-cover" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] text-[#FCE79C] font-bold mb-2">
              <Crown className="w-3.5 h-3.5" />
              <span>STANDALONE ADMINISTRATOR PORTAL</span>
            </div>
            <h1 className="text-2xl font-extrabold gold-gradient-text">إدارة منظومة المحاسبي Plus</h1>
            <p className="text-xs text-[#A8A08C] mt-1">بوابة مستقلة تماماً لإدارة الصلاحيات والفترات المالية وقواعد البيانات</p>
          </div>

          {needsApiUrl && (
            <div className="p-3.5 rounded-xl bg-[#16130A] border border-[#D4AF37]/60 text-right space-y-2">
              <div className="text-xs font-bold text-[#FCE79C]">ربط خادم الـ Backend المنشور</div>
              <div className="flex gap-2">
                <input
                  dir="ltr"
                  placeholder="https://plus-erp-api.vercel.app"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="flex-1 gold-input rounded-xl px-3 py-2 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiBaseUrl(apiUrlInput);
                    adminFetch('/api/health').then(() => {
                      setNeedsApiUrl(false);
                      setLoginErr('');
                    }).catch((e) => setLoginErr(e.message));
                  }}
                  className="gold-metallic-btn px-3 py-2 rounded-xl text-xs cursor-pointer"
                >
                  ربط
                </button>
              </div>
            </div>
          )}

          {loginErr && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs">{loginErr}</div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginErr('');
              try {
                const res = await adminFetch('/api/auth/login', {
                  method: 'POST',
                  body: JSON.stringify({ username: loginUsername, password: loginPassword, portal: 'ADMIN' }),
                });
                setAdminToken(res.token);
                await loadAllAdminData();
                setAdminUser(res.user);
              } catch (err: any) {
                setLoginErr(err.message);
              }
            }}
            className="space-y-3 text-right"
          >
            <div>
              <label className="text-xs text-[#C8C0AC]">حساب مدير النظام</label>
              <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-[#C8C0AC]">كلمة المرور الإدارية</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full gold-input rounded-xl px-3.5 py-2.5 text-sm mt-1" />
            </div>
            <button type="submit" className="w-full gold-metallic-btn py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4" /> دخول مركز القيادة الإداري
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeRoleObj = roles.find((r) => r.role_code === selectedRoleCode);
  const inspectedTable = schemaData?.tables?.find((t: any) => t.name === selectedTable);

  return (
    <div className="min-h-screen bg-[#050507] text-[#F7F3E8] relative">
      {/* العلامة المائية الملكية بشكل علامة الزائد الموجودة في الصورة */}
      <PlusWatermark />

      {/* الشريط الرئاسي العلوي لبوابة المدير المستقلة (تصميم قيادي مختلف ومستقل كلياً) */}
      <header className="relative z-20 bg-gradient-to-l from-[#12100A] via-[#09090D] to-[#12100A] border-b border-[#D4AF37]/35">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.3)] bg-black">
              <img src="/plus-logo.jpeg" alt="Plus Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-royal tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#FCE79C] border border-[#D4AF37]/40">
                  PLUS SYSTEM ADMINISTRATOR
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-extrabold gold-gradient-text mt-0.5">
                مركز الحوكمة وإدارة النظام — المحاسبي Plus
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0D0D13] border border-[#D4AF37]/25 text-xs">
              <PlusCrossEmblem size={22} idPrefix="adm-hdr" className={tabSwitching ? 'animate-plus-spin-fast' : ''} />
              <div>
                <div className="font-bold text-[#FAF5E8]">{adminUser.full_name}</div>
                <div className="text-[10px] text-[#E5C158]">{adminUser.role_name}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setAdminToken(null);
                setAdminUser(null);
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#14141C] hover:bg-red-950/50 border border-[#D4AF37]/30 text-[#FCE79C] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </div>

        {/* شريط أوامر الحوكمة الستة */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-3 flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'نظرة عامة ورقابة الجداول', icon: <Activity className="w-4 h-4" /> },
            { id: 'users', label: 'إدارة المستخدمين والحسابات', icon: <Users className="w-4 h-4" /> },
            { id: 'roles', label: 'مصفوفة الصلاحيات (Permissions)', icon: <KeyRound className="w-4 h-4" /> },
            { id: 'fiscal', label: 'إقفال وترحيل الفترات المالية', icon: <CalendarClock className="w-4 h-4" /> },
            { id: 'schema', label: 'مخطط SQL Schema والنسخ الاحتياطي', icon: <Database className="w-4 h-4" /> },
            { id: 'domains', label: 'النطاقات المستقلة وسجل المراجعة', icon: <Globe className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id as AdminTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                tab === item.id
                  ? 'gold-metallic-btn'
                  : 'bg-[#0E0E14] text-[#D7CEB8] border border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ساحة العمل الإدارية */}
      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {flashMsg && (
          <div className={`p-4 rounded-xl text-sm border ${
            flashMsg.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border-red-500/50 text-red-200'
          }`}>
            {flashMsg.text}
          </div>
        )}

        {tabSwitching ? (
          <PlusSpinner size={68} label="جارٍ فتح وحدة الإدارة والحوكمة..." />
        ) : (
          <>
            {/* 1. نظرة عامة */}
            {tab === 'overview' && overview && (
              <div className="space-y-6">
                {/* بطاقات البنية المستقلة ثلاثية الطبقات (Frontend / Backend / Admin) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="royal-card royal-double-frame rounded-2xl p-5">
                    <div className="text-[11px] font-royal text-[#E5C158]">TIER 1 • STANDALONE FRONTEND</div>
                    <h3 className="text-base font-extrabold text-[#FAF5E8] mt-1">تطبيق المحاسبي Plus (ERP)</h3>
                    <p className="text-xs font-mono text-emerald-300 mt-1">{overview.company?.frontend_domain}</p>
                    <p className="text-xs text-[#A8A08C] mt-2">واجهة المحاسبين والوحدات الست والتقارير الختامية بدومين مستقل تماماً.</p>
                  </div>
                  <div className="royal-card royal-double-frame rounded-2xl p-5">
                    <div className="text-[11px] font-royal text-[#E5C158]">TIER 2 • STANDALONE ADMINISTRATOR</div>
                    <h3 className="text-base font-extrabold text-[#FAF5E8] mt-1">بوابة مدير النظام (Plus Admin)</h3>
                    <p className="text-xs font-mono text-emerald-300 mt-1">{overview.company?.admin_domain}</p>
                    <p className="text-xs text-[#A8A08C] mt-2">بوابة حوكمة وصلاحيات خاصة بمنظومة Plus حصرياً وبمعزل تام عن أي مشروع آخر.</p>
                  </div>
                  <div className="royal-card royal-double-frame rounded-2xl p-5">
                    <div className="text-[11px] font-royal text-[#E5C158]">TIER 3 • RELATIONAL SQL API</div>
                    <h3 className="text-base font-extrabold text-[#FAF5E8] mt-1">خادم البيانات الموحد (Plus API)</h3>
                    <p className="text-xs font-mono text-emerald-300 mt-1">{overview.company?.api_domain}</p>
                    <p className="text-xs text-[#A8A08C] mt-2">قاعدة بيانات علائقية موحدة تمنع تكرار أو ازدواج البيانات بعلاقات One-to-Many.</p>
                  </div>
                </div>

                {/* إحصاءات النظام */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
                  <div className="royal-card rounded-2xl p-4">
                    <div className="text-xs text-[#A8A08C]">إجمالي الجداول العلائقية</div>
                    <div className="text-2xl font-extrabold text-[#FCE79C] mt-1">{overview.stats.total_tables} جدول</div>
                  </div>
                  <div className="royal-card rounded-2xl p-4">
                    <div className="text-xs text-[#A8A08C]">إجمالي السجلات المخزنة</div>
                    <div className="text-2xl font-extrabold text-emerald-300 mt-1">{overview.stats.total_records} سجل</div>
                  </div>
                  <div className="royal-card rounded-2xl p-4">
                    <div className="text-xs text-[#A8A08C]">المستخدمون النشطون</div>
                    <div className="text-2xl font-extrabold text-[#FAF5E8] mt-1">{overview.stats.active_users} / {overview.stats.total_users}</div>
                  </div>
                  <div className="royal-card rounded-2xl p-4">
                    <div className="text-xs text-[#A8A08C]">حالة التوازن المحاسبي العام</div>
                    <div className="text-sm font-extrabold text-emerald-300 mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>متوازن 100% ({overview.stats.total_journal_volume.toLocaleString()})</span>
                    </div>
                  </div>
                </div>

                {/* خريطة الجداول الرئيسية وجداول الحركة */}
                <div className="royal-card rounded-2xl p-5">
                  <h3 className="text-sm font-bold gold-gradient-text mb-4">مراقبة حية لكافة الجداول الرئيسية (Master) وجداول الحركة (Transaction)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 tabular-nums">
                    {overview.tableMeta.map((t: any) => (
                      <div key={t.table} className="p-3 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/20 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#FAF5E8]">{t.label}</div>
                          <div className="text-[11px] font-mono text-[#9E9682]">{t.table} • {t.category}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 text-[#FCE79C] text-xs font-bold">
                          {t.row_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. إدارة المستخدمين */}
            {tab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
                      notify('ok', 'تم إنشاء حساب المستخدم وتفعيل صلاحياته بنجاح');
                      setNewUser({ username: '', full_name: '', email: '', password: '', role_code: 'SALES_ACCOUNTANT', is_admin_portal_allowed: false });
                      await loadAllAdminData();
                    } catch (err: any) {
                      notify('err', err.message);
                    }
                  }}
                  className="lg:col-span-4 royal-card rounded-2xl p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold gold-gradient-text flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                    <span>إضافة مستخدم / محاسب جديد</span>
                  </h3>
                  <input placeholder="اسم الدخول (username)" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
                  <input placeholder="الاسم الكامل والمسمى" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
                  <input type="email" placeholder="البريد الوظيفي" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" />
                  <input type="password" placeholder="كلمة المرور المبدئية" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs" required />
                  <div>
                    <label className="text-[11px] text-[#B5AD99]">الدور الوظيفي ومجموعة الصلاحيات</label>
                    <select value={newUser.role_code} onChange={(e) => setNewUser({ ...newUser, role_code: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs mt-1">
                      {roles.map((r) => <option key={r.role_code} value={r.role_code}>{r.role_name}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#E5C86B] pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.is_admin_portal_allowed}
                      onChange={(e) => setNewUser({ ...newUser, is_admin_portal_allowed: e.target.checked })}
                      className="accent-[#D4AF37]"
                    />
                    <span>السماح بالدخول لبوابة مدير النظام (Administrator)</span>
                  </label>
                  <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">إنشاء الحساب وتطبيق الصلاحيات</button>
                </form>

                <div className="lg:col-span-8 royal-card rounded-2xl p-5 overflow-x-auto">
                  <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">حسابات الموظفين والمستخدمين ({users.length})</h3>
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                        <th className="py-2 px-2">المستخدم</th>
                        <th className="py-2 px-2">الاسم الكامل</th>
                        <th className="py-2 px-2">الدور الوظيفي</th>
                        <th className="py-2 px-2">بوابة الأدمن</th>
                        <th className="py-2 px-2">الحالة</th>
                        <th className="py-2 px-2">تحكم سريع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4AF37]/10">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 px-2 font-mono text-[#E5C158]">{u.username}</td>
                          <td className="py-2.5 px-2 font-bold">{u.full_name}</td>
                          <td className="py-2.5 px-2">
                            <select
                              value={u.role_code}
                              onChange={async (e) => {
                                await adminFetch(`/api/admin/users/${u.id}`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ role_code: e.target.value }),
                                });
                                notify('ok', `تم تحديث الدور الوظيفي للمستخدم ${u.username}`);
                                loadAllAdminData();
                              }}
                              className="gold-input rounded-lg px-2 py-1 text-[11px]"
                            >
                              {roles.map((r) => <option key={r.role_code} value={r.role_code}>{r.role_name}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.is_admin_portal_allowed ? 'bg-[#D4AF37]/25 text-[#FCE79C]' : 'bg-white/5 text-[#8E8775]'}`}>
                              {u.is_admin_portal_allowed ? 'مسموح' : 'ERP فقط'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {u.is_active ? 'نشط' : 'موقوف'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            {u.username !== 'admin' && (
                              <button
                                onClick={async () => {
                                  await adminFetch(`/api/admin/users/${u.id}`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ is_active: !u.is_active }),
                                  });
                                  notify('ok', 'تم تحديث حالة الحساب');
                                  loadAllAdminData();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#16161F] border border-[#D4AF37]/30 text-[11px] text-[#FCE79C] cursor-pointer"
                              >
                                {u.is_active ? 'إيقاف مؤقت' : 'إعادة تفعيل'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. مصفوفة الصلاحيات (Permissions Matrix) */}
            {tab === 'roles' && activeRoleObj && (
              <div className="royal-card rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-4">
                  <div>
                    <h3 className="text-base font-bold gold-gradient-text">مصفوفة صلاحيات المستخدمين الدقيقة (RBAC Permissions)</h3>
                    <p className="text-xs text-[#A8A08C]">تحكم في صلاحية كل دور وظيفي (إدخال فقط، تعديل، حذف، أو عرض تقارير) لكل وحدة من الوحدات الست</p>
                  </div>
                  <select
                    value={selectedRoleCode}
                    onChange={(e) => setSelectedRoleCode(e.target.value)}
                    className="gold-input rounded-xl px-4 py-2.5 text-xs font-bold"
                  >
                    {roles.map((r) => (
                      <option key={r.role_code} value={r.role_code}>{r.role_name} ({r.role_code})</option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                        <th className="py-2.5 px-3">الوحدة البرمجية (Module)</th>
                        {ACTION_LABELS.map((act) => (
                          <th key={act.key} className="py-2.5 px-3 text-center">{act.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4AF37]/10">
                      {Object.entries(MODULE_LABELS).map(([modKey, modLabel]) => (
                        <tr key={modKey}>
                          <td className="py-3 px-3 font-bold text-[#FAF5E8]">{modLabel}</td>
                          {ACTION_LABELS.map((act) => {
                            const checked = Boolean(activeRoleObj.permissions?.[modKey]?.[act.key]);
                            return (
                              <td key={act.key} className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={activeRoleObj.role_code === 'SUPER_ADMIN'}
                                  checked={activeRoleObj.role_code === 'SUPER_ADMIN' ? true : checked}
                                  onChange={(e) => {
                                    const updatedRoles = roles.map((r) => {
                                      if (r.role_code !== selectedRoleCode) return r;
                                      const nextPerms = {
                                        ...r.permissions,
                                        [modKey]: { ...(r.permissions?.[modKey] || {}), [act.key]: e.target.checked },
                                      };
                                      return { ...r, permissions: nextPerms };
                                    });
                                    setRoles(updatedRoles);
                                  }}
                                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {activeRoleObj.role_code !== 'SUPER_ADMIN' && (
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          await adminFetch(`/api/admin/roles/${activeRoleObj.role_code}`, {
                            method: 'PUT',
                            body: JSON.stringify({ permissions: activeRoleObj.permissions }),
                          });
                          notify('ok', `تم حفظ وتطبيق مصفوفة الصلاحيات لدور (${activeRoleObj.role_name}) فوراً`);
                        } catch (err: any) {
                          notify('err', err.message);
                        }
                      }}
                      className="gold-metallic-btn px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> حفظ مصفوفة الصلاحيات
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. إقفال وترحيل الفترات المالية */}
            {tab === 'fiscal' && (
              <div className="space-y-5">
                <div className="royal-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-bold gold-gradient-text">محرك إقفال وترحيل الفترات المالية السنوية</h3>
                      <p className="text-xs text-[#B5AD99] mt-1 leading-relaxed">
                        يقوم هذا المحرك باستخراج أرصدة حسابات الإيرادات والمصروفات الختامية، وتوليد قيد إقفال آلي متوازن يرحّل صافي الربح أو الخسارة إلى حساب الأرباح المحتجزة (2302)، ثم يفتح الفترة المالية الجديدة بأرصدة الميزانية المرحلة.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {periods.map((p) => (
                      <div key={p.period_id} className="p-4 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/30 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-[#FCE79C]">{p.period_id} — {p.period_name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.status === 'مفتوحة' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>{p.status}</span>
                        </div>
                        <div className="text-xs text-[#A8A08C] tabular-nums">
                          من {p.start_date} إلى {p.end_date}
                          {p.closing_entry_no && ` • قيد الإقفال: ${p.closing_entry_no}`}
                        </div>
                        {p.status === 'مفتوحة' && (
                          <button
                            onClick={async () => {
                              try {
                                const nextYear = Number(String(p.period_id).replace(/\D/g, '')) + 1;
                                const res = await adminFetch('/api/admin/fiscal-periods/close-rollover', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    period_id: p.period_id,
                                    next_period_id: `FY-${nextYear}`,
                                    next_period_name: `السنة المالية ${nextYear}`,
                                  }),
                                });
                                notify('ok', `${res.message} — قيد الإقفال: ${res.closing_entry_no}`);
                                loadAllAdminData();
                              } catch (err: any) {
                                notify('err', err.message);
                              }
                            }}
                            className="gold-metallic-btn py-2.5 px-4 rounded-xl text-xs cursor-pointer"
                          >
                            تنفيذ إقفال {p.period_id} وترحيل الأرصدة للفترة الجديدة
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. مخطط قاعدة البيانات SQL Schema والنسخ الاحتياطي */}
            {tab === 'schema' && schemaData && (
              <div className="space-y-6">
                <div className="royal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold gold-gradient-text">مخطط قاعدة البيانات العلائقية الكامل (SQL Schema) والنسخ الاحتياطي</h3>
                    <p className="text-xs text-[#A8A08C]">استعرض بنية الجداول والمفاتيح الأساسية والأجنبية أو حمّل ملف SQL الكامل</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadTextFile('plus-erp-schema.sql', schemaData.sql, 'application/sql;charset=utf-8')}
                      className="gold-metallic-btn px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> تحميل ملف schema.sql الكامل
                    </button>
                    <button
                      onClick={async () => {
                        const backup = await adminFetch('/api/admin/backup');
                        downloadTextFile(`plus-erp-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json');
                        notify('ok', 'تم تصدير النسخة الاحتياطية الكاملة لقاعدة البيانات بنجاح');
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#14141D] border border-[#D4AF37]/40 text-[#FCE79C] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> نسخة احتياطية JSON
                    </button>
                    <button
                      onClick={async () => {
                        const res = await adminFetch('/api/admin/reset-demo', { method: 'POST' });
                        notify('ok', res.message);
                        loadAllAdminData();
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#14141D] border border-amber-500/40 text-amber-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> إعادة ضبط البيانات القياسية
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-4 royal-card rounded-2xl p-4 max-h-[500px] overflow-y-auto space-y-1.5">
                    <div className="text-xs font-bold text-[#E5C158] mb-2">الجداول ({schemaData.tables.length})</div>
                    {schemaData.tables.map((t: any) => (
                      <button
                        key={t.name}
                        onClick={() => setSelectedTable(t.name)}
                        className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          selectedTable === t.name ? 'bg-[#D4AF37]/25 text-[#FCE79C] border border-[#D4AF37]' : 'bg-[#0B0B10] text-[#D1C8B4]'
                        }`}
                      >
                        <span className="font-mono">{t.name}</span>
                        <span className="text-[11px] opacity-80">{t.row_count} صف</span>
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-8 royal-card rounded-2xl p-5 space-y-4">
                    {inspectedTable && (
                      <>
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                          <h4 className="text-sm font-extrabold font-mono text-[#FCE79C]">TABLE: {inspectedTable.name}</h4>
                          <span className="text-xs text-[#A8A08C]">عدد السجلات الحالية: {inspectedTable.row_count}</span>
                        </div>
                        <table className="w-full text-xs text-right">
                          <thead>
                            <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                              <th className="py-2 px-2">اسم العمود</th>
                              <th className="py-2 px-2">نوع البيانات</th>
                              <th className="py-2 px-2">المفتاح الأساسي (PK)</th>
                              <th className="py-2 px-2">إلزامي (NOT NULL)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D4AF37]/10 font-mono">
                            {inspectedTable.columns.map((c: any) => (
                              <tr key={c.cid}>
                                <td className="py-2 px-2 text-[#FAF5E8]">{c.name}</td>
                                <td className="py-2 px-2 text-[#E5C158]">{c.type}</td>
                                <td className="py-2 px-2">{c.pk ? '🔑 PRIMARY KEY' : '—'}</td>
                                <td className="py-2 px-2">{c.notnull ? 'YES' : 'NULLABLE'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {inspectedTable.foreignKeys?.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#D4AF37]/25">
                            <div className="text-xs font-bold text-[#E5C158] mb-1.5">العلاقات المرجعية (One-to-Many Foreign Keys):</div>
                            {inspectedTable.foreignKeys.map((fk: any, i: number) => (
                              <div key={i} className="text-xs font-mono text-emerald-300">
                                {fk.from} ──► {fk.table}({fk.to}) [ON UPDATE {fk.on_update}]
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. إعدادات الدومين المستقل وسجل المراجعة */}
            {tab === 'domains' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await adminFetch('/api/admin/company-domains', {
                        method: 'PUT',
                        body: JSON.stringify(domainForm),
                      });
                      setDomainForm(res.company);
                      notify('ok', res.message);
                      loadAllAdminData();
                    } catch (err: any) {
                      notify('err', err.message);
                    }
                  }}
                  className="lg:col-span-5 royal-card rounded-2xl p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold gold-gradient-text">إعدادات النطاقات المستقلة (Custom Domains)</h3>
                  <p className="text-xs text-[#A8A08C]">
                    تُضبط هنا عناوين النطاقات الخاصة بتطبيق المحاسبي Plus بشكل مستقل تماماً عن أي متجر أو تطبيق آخر.
                  </p>
                  <div>
                    <label className="text-xs text-[#C7BFA9]">دومين واجهة المحاسبين (ERP Frontend)</label>
                    <input value={domainForm.frontend_domain || ''} onChange={(e) => setDomainForm({ ...domainForm, frontend_domain: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs font-mono mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-[#C7BFA9]">دومين بوابة مدير النظام (Plus Administrator)</label>
                    <input value={domainForm.admin_domain || ''} onChange={(e) => setDomainForm({ ...domainForm, admin_domain: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs font-mono mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-[#C7BFA9]">دومين خادم الـ API وقاعدة البيانات (Backend)</label>
                    <input value={domainForm.api_domain || ''} onChange={(e) => setDomainForm({ ...domainForm, api_domain: e.target.value })} className="w-full gold-input rounded-xl px-3 py-2 text-xs font-mono mt-1" />
                  </div>
                  <button type="submit" className="w-full gold-metallic-btn py-2.5 rounded-xl text-xs cursor-pointer">
                    حفظ إعدادات النطاقات المستقلة
                  </button>
                </form>

                <div className="lg:col-span-7 royal-card rounded-2xl p-5 overflow-x-auto max-h-[540px] overflow-y-auto">
                  <h3 className="text-sm font-bold text-[#FAF5E8] mb-3">سجل الرقابة ومراجعة العمليات (Audit Logs)</h3>
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-[#D4AF37]/30 text-[#E5C158]">
                        <th className="py-2 px-2">التوقيت</th>
                        <th className="py-2 px-2">البوابة</th>
                        <th className="py-2 px-2">المستخدم</th>
                        <th className="py-2 px-2">الوحدة / الإجراء</th>
                        <th className="py-2 px-2">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4AF37]/10">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 px-2 font-mono text-[11px] text-[#A8A08C]">{log.created_at}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              log.portal === 'ADMIN' ? 'bg-[#D4AF37]/25 text-[#FCE79C]' : 'bg-emerald-500/15 text-emerald-300'
                            }`}>{log.portal}</span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[#E5C158]">{log.username}</td>
                          <td className="py-2 px-2 font-bold">{log.module} — {log.action}</td>
                          <td className="py-2 px-2 text-[#B5AD99]">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
