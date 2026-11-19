import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Shield,
  Users,
  Lock,
  CalendarClock,
  Database,
  ScrollText,
  Globe,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { adminFetch, setAdminToken, getApiBaseUrl } from '../bridge/api';
import { isOnline } from '../bridge/network';
import { PlusCrossEmblem, PlusSpinner, PlusWatermark } from '../components/BrandIdentity';

type AdminTab = 'overview' | 'users' | 'roles' | 'periods' | 'schema' | 'audit';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'users', label: 'المستخدمون', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'roles', label: 'الصلاحيات', icon: <Lock className="w-3.5 h-3.5" /> },
  { id: 'periods', label: 'الفترات المالية', icon: <CalendarClock className="w-3.5 h-3.5" /> },
  { id: 'schema', label: 'قاعدة البيانات', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'audit', label: 'سجل التدقيق', icon: <ScrollText className="w-3.5 h-3.5" /> },
];

export const AdminPanel: React.FC<{
  adminUser: any;
  onAdminLogin: (u: any) => void;
  onBack: () => void;
  onLogout: () => void;
}> = ({ adminUser, onAdminLogin, onBack, onLogout }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loadingTab, setLoadingTab] = useState(false);

  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [schema, setSchema] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await adminFetch<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, portal: 'ADMIN' }),
      });
      if (!res?.user?.is_admin_portal_allowed) {
        throw new Error('هذا الحساب لا يملك صلاحية دخول بوابة مدير النظام');
      }
      setAdminToken(res.token);
      onAdminLogin(res.user);
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const loadTab = async (t: AdminTab) => {
    setLoadingTab(true);
    try {
      if (t === 'overview') setOverview(await adminFetch('/api/admin/overview'));
      if (t === 'users') setUsers((await adminFetch<any>('/api/admin/users')).users || []);
      if (t === 'roles') setRoles((await adminFetch<any>('/api/admin/roles')).roles || []);
      if (t === 'periods') setPeriods((await adminFetch<any>('/api/admin/fiscal-periods')).periods || []);
      if (t === 'schema') setSchema(await adminFetch('/api/admin/schema'));
      if (t === 'audit') setLogs((await adminFetch<any>('/api/admin/audit-logs')).logs || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل البيانات');
    } finally {
      setLoadingTab(false);
    }
  };

  useEffect(() => {
    if (adminUser) void loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, adminUser]);

  // شاشة دخول الأدمن
  if (!adminUser) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-[#050507]">
        <PlusWatermark />
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex flex-col items-center mb-7">
            <PlusCrossEmblem size={72} idPrefix="adm-login" />
            <h2 className="mt-4 text-lg font-extrabold text-[#FAF6EA]">بوابة مدير النظام</h2>
            <p className="text-[10.5px] text-[#9C9480] mt-1 text-center">
              إدارة الصلاحيات والفترات المالية والنسخ الاحتياطي
            </p>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-b from-[#12110E] to-[#07070A] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10.5px] text-[#C8C0AA]">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="truncate" dir="ltr">
                {getApiBaseUrl() || 'لم يتم ضبط رابط الخادم'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-[#9E9682] mb-1.5">حساب مدير النظام</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#07070A] border border-[#D4AF37]/28 text-[12.5px] outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#9E9682] mb-1.5">كلمة المرور الإدارية</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void login()}
                className="w-full px-3 py-2.5 rounded-xl bg-[#07070A] border border-[#D4AF37]/28 text-[12.5px] outline-none focus:border-[#D4AF37]"
              />
            </div>

            {error && (
              <div className="text-[10.5px] px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[#F0A8A8]">
                {error}
              </div>
            )}
            {!isOnline() && (
              <div className="text-[10.5px] px-3 py-2 rounded-lg bg-[#E08A3C]/10 border border-[#E08A3C]/30 text-[#FFC9A3] flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> بوابة الإدارة تحتاج اتصالاً بالإنترنت
              </div>
            )}

            <button
              onClick={() => void login()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-[#E9C662] to-[#C59B27] text-[#17130A] font-extrabold text-[12.5px] disabled:opacity-50"
            >
              {loading ? <PlusSpinner size={15} /> : <Shield className="w-4 h-4" />}
              دخول مركز القيادة
            </button>

            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-[#8E8778]"
            >
              <ArrowRight className="w-3.5 h-3.5" /> رجوع لاختيار البوابة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = overview?.stats || {};
  const tableMeta: any[] = overview?.tableMeta || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#050507]">
      <header className="safe-top bg-[#08080C] border-b border-[#D4AF37]/25">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-[#B8B09C]">
            <ArrowRight className="w-4 h-4" />
          </button>
          <PlusCrossEmblem size={24} idPrefix="adm-hdr" />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-extrabold text-[#FCE79C]">بوابة مدير النظام</div>
            <div className="text-[10px] text-[#8E8778] truncate">{adminUser.full_name}</div>
          </div>
          <button
            onClick={() => void loadTab(tab)}
            className="p-2 rounded-lg hover:bg-white/10 text-[#D4AF37]"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTab ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onLogout} className="p-2 rounded-lg hover:bg-white/10 text-[#B8B09C]">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10.5px] font-bold whitespace-nowrap border transition ${
                tab === t.id
                  ? 'bg-[#D4AF37]/16 border-[#D4AF37]/55 text-[#FCE79C]'
                  : 'border-white/8 text-[#8E8778]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-3 py-4 pb-10">
        {loadingTab && (
          <div className="py-14 grid place-items-center">
            <PlusSpinner size={54} label="جارٍ تحميل البيانات..." />
          </div>
        )}

        {!loadingTab && tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { k: 'الجداول', v: stats.total_tables ?? '—', s: 'جدول علائقي' },
                { k: 'السجلات', v: stats.total_records ?? '—', s: 'سجل مخزّن' },
                { k: 'المستخدمون', v: `${stats.active_users ?? 0}/${stats.total_users ?? 0}`, s: 'نشط' },
                {
                  k: 'التوازن المحاسبي',
                  v: stats.journal_balanced ? 'متوازن' : 'غير متوازن',
                  s: stats.journal_balanced ? '100%' : 'يتطلب مراجعة',
                },
              ].map((c) => (
                <div
                  key={c.k}
                  className="rounded-xl border border-[#D4AF37]/22 bg-[#0B0B10] p-3.5"
                >
                  <div className="text-[9.5px] text-[#8E8778]">{c.k}</div>
                  <div className="text-lg font-extrabold text-[#FCE79C] tabular-nums mt-0.5">
                    {c.v}
                  </div>
                  <div className="text-[9px] text-[#756F62]">{c.s}</div>
                </div>
              ))}
            </div>

            <h3 className="text-[11px] font-bold text-[#E9C662] pt-1">الجداول الرئيسية</h3>
            <div className="space-y-1.5">
              {tableMeta.slice(0, 30).map((t: any) => (
                <div
                  key={t.table}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#D4AF37]/15 bg-[#0B0B10]"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#E9DDBB] font-mono truncate" dir="ltr">
                      {t.table}
                    </div>
                    <div className="text-[9px] text-[#7E7869]">{t.category}</div>
                  </div>
                  <div className="text-[12.5px] font-extrabold text-[#D4AF37] tabular-nums shrink-0">
                    {t.records}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingTab && tab === 'users' && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border border-[#D4AF37]/18 bg-[#0B0B10] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-bold text-[#F3EAD2]">{u.full_name}</div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full border ${
                      u.is_active
                        ? 'border-[#40C178]/40 text-[#8EE3B0] bg-[#40C178]/10'
                        : 'border-red-500/40 text-[#F0A8A8] bg-red-500/10'
                    }`}
                  >
                    {u.is_active ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <div className="text-[10px] text-[#8E8778] mt-1 font-mono" dir="ltr">
                  {u.username}
                </div>
                <div className="text-[10px] text-[#A9A294] mt-1">{u.role_name}</div>
                {u.is_admin_portal_allowed ? (
                  <div className="text-[9px] text-[#D4AF37] mt-1 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> يملك دخول بوابة الإدارة
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {!loadingTab && tab === 'roles' && (
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.role_code} className="rounded-xl border border-[#D4AF37]/18 bg-[#0B0B10] p-3.5">
                <div className="text-[12px] font-bold text-[#FCE79C]">{r.role_name}</div>
                <div className="text-[9.5px] text-[#756F62] font-mono mt-0.5" dir="ltr">
                  {r.role_code}
                </div>
                <div className="text-[10px] text-[#A9A294] mt-1.5 leading-relaxed">
                  {r.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingTab && tab === 'periods' && (
          <div className="space-y-2">
            {periods.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-[#D4AF37]/18 bg-[#0B0B10] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold text-[#FCE79C]">{p.period_name}</div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#40C178]/40 text-[#8EE3B0]">
                    {p.status}
                  </span>
                </div>
                <div className="text-[10px] text-[#8E8778] mt-1 tabular-nums" dir="ltr">
                  {p.start_date} → {p.end_date}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingTab && tab === 'schema' && (
          <div className="space-y-2">
            <div className="rounded-xl border border-[#D4AF37]/22 bg-[#0B0B10] p-3.5 text-[10.5px] text-[#A9A294] leading-relaxed">
              مخطط قاعدة البيانات العلائقية — {schema?.tables?.length ?? 0} جدولاً
            </div>
            {(schema?.tables || []).map((t: any) => (
              <details
                key={t.name}
                className="rounded-xl border border-[#D4AF37]/15 bg-[#0B0B10] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer text-[11px] text-[#E9DDBB] font-mono list-none">
                  <span dir="ltr" className="truncate">
                    {t.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#8E8778] shrink-0" />
                </summary>
                <div className="px-3 pb-3 text-[9.5px] text-[#7E7869] font-mono" dir="ltr">
                  {(t.columns || [])
                    .map((c: any) => `${c.name}:${c.type}${c.pk ? ' PK' : ''}${c.notnull ? ' NOT NULL' : ''}`)
                    .join('\n')}
                </div>
              </details>
            ))}
          </div>
        )}

        {!loadingTab && tab === 'audit' && (
          <div className="space-y-1.5">
            {logs.map((l: any) => (
              <div key={l.id} className="rounded-lg border border-[#D4AF37]/15 bg-[#0B0B10] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#F3EAD2]">{l.action}</span>
                  <span className="text-[9px] text-[#7E7869] shrink-0">
                    {String(l.created_at).slice(0, 16)}
                  </span>
                </div>
                <div className="text-[9.5px] text-[#8E8778] mt-0.5">
                  {l.username || l.user_id} · {l.module || ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 text-[10.5px] px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-[#F0A8A8] flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {error}
          </div>
        )}
      </main>
    </div>
  );
};
