import React, { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, CloudOff, Server, Download, Trash2, ShieldCheck } from 'lucide-react';
import {
  apiFetch,
  getApiBaseUrl,
  getStoredToken,
  setStoredToken,
  adminFetch,
  getAdminToken,
  setAdminToken,
  type ApiOptions,
} from './bridge/api';
import { isOnline, onNetworkChange, probeConnection } from './bridge/network';
import { startSyncEngine } from './bridge/syncEngine';
import { PlusCrossEmblem, PlusSpinner, PlusWatermark } from './components/BrandIdentity';
import { NetworkBanner } from './components/NetworkBanner';
import { SyncCenter } from './components/SyncCenter';
import { PortalPicker } from './PortalPicker';
import { LoginScreen } from './components/LoginScreen';
import { DashboardModule, type ModuleKey } from './modules/DashboardModule';
import { MasterDataModule } from './modules/MasterDataModule';
import { FinanceModule } from './modules/FinanceModule';
import { SalesModule } from './modules/SalesModule';
import { PurchasesModule } from './modules/PurchasesModule';
import { InventoryModule } from './modules/InventoryModule';
import { HRModule } from './modules/HRModule';
import { ReportsModule } from './modules/ReportsModule';
import { AdminPanel } from './admin/AdminPanel';

declare const __APP_VERSION__: string;

type Portal = 'erp' | 'admin' | null;

const NAV: { key: ModuleKey | 'reports'; label: string; short: string }[] = [
  { key: 'dashboard', label: 'لوحة التحكم', short: 'الرئيسية' },
  { key: 'master', label: '1. البيانات الأساسية', short: 'الأساسية' },
  { key: 'finance', label: '2. الإدارة المالية', short: 'المالية' },
  { key: 'sales', label: '3. المبيعات والعملاء', short: 'المبيعات' },
  { key: 'purchases', label: '4. المشتريات والموردين', short: 'المشتريات' },
  { key: 'inventory', label: '5. المخزون السلعي', short: 'المخزون' },
  { key: 'hr', label: '6. الموارد البشرية', short: 'الموارد' },
  { key: 'reports', label: 'التقارير الختامية', short: 'التقارير' },
];

export const App: React.FC = () => {
  const [portal, setPortal] = useState<Portal>(null);
  const [booting, setBooting] = useState(true);
  const [online, setOnline] = useState(isOnline());
  const [syncOpen, setSyncOpen] = useState(false);

  // جلسة المحاسبين
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey | 'reports'>('dashboard');

  // جلسة بوابة الأدمن
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const boot = async () => {
      startSyncEngine();
      onNetworkChange(setOnline);
      await probeConnection(getApiBaseUrl());

      // استرجاع الجلسات المحفوظة
      if (getStoredToken()) {
        try {
          const me = await apiFetch<any>('/api/auth/me', { noCache: true } as ApiOptions);
          setUser(me.user);
          setCompany(me.company);
          setPortal('erp');
        } catch {
          /* الجلسة منتهية أو بدون اتصال — نكمل لشاشة الاختيار */
        }
      }
      if (!portal && getAdminToken()) {
        try {
          const me = await adminFetch<any>('/api/auth/me');
          if (me?.user?.is_admin_portal_allowed) {
            setAdminUser(me.user);
          }
        } catch {
          /* ignore */
        }
      }
      setBooting(false);
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoutErp = () => {
    setStoredToken(null);
    setUser(null);
    setCompany(null);
    setPortal(null);
    setActiveModule('dashboard');
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    setPortal(null);
  };

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050507]">
        <PlusSpinner size={78} label="جارٍ تهيئة تطبيق المحاسبي Plus..." fullScreen />
      </div>
    );
  }

  // شاشة اختيار البوابة
  if (!portal) {
    return (
      <>
        <PortalPicker
          online={online}
          onPick={(p) => {
            // بوابة الأدمن لها شاشة دخول خاصة داخل لوحة الإدارة
            setPortal(p);
          }}
        />
        <SyncCenter open={syncOpen} onClose={() => setSyncOpen(false)} />
      </>
    );
  }

  // بوابة مدير النظام
  if (portal === 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#050507]">
        <NetworkBanner onOpenSync={() => setSyncOpen(true)} />
        <div className="flex-1 min-h-0">
          <AdminPanel
            adminUser={adminUser}
            onAdminLogin={(u) => setAdminUser(u)}
            onBack={() => setPortal(null)}
            onLogout={logoutAdmin}
          />
        </div>
        <SyncCenter open={syncOpen} onClose={() => setSyncOpen(false)} />
      </div>
    );
  }

  // تطبيق المحاسبين — شاشة الدخول
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#050507]">
        <NetworkBanner onOpenSync={() => setSyncOpen(true)} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <LoginScreen
            onLoginSuccess={({ user: u, company: c }) => {
              setUser(u);
              setCompany(c);
              setActiveModule('dashboard');
            }}
          />
        </div>
        <SyncCenter open={syncOpen} onClose={() => setSyncOpen(false)} />
      </div>
    );
  }

  // تطبيق المحاسبين — الوحدات
  const navItems = NAV.filter((item) => {
    if (item.key === 'dashboard') return true;
    const perms = user?.permissions || {};
    return perms[item.key]?.view !== false && perms[item.key] !== undefined
      ? Boolean(perms[item.key]?.view ?? perms[item.key])
      : true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#050507]">
      <div className="safe-top bg-[#08080C]">
        <NetworkBanner onOpenSync={() => setSyncOpen(true)} />
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[#D4AF37]/25">
          <button
            onClick={logoutErp}
            className="p-2 rounded-lg hover:bg-white/10 text-[#B8B09C]"
            aria-label="خروج"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <PlusCrossEmblem size={26} idPrefix="mob-hdr" />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-extrabold text-[#FCE79C] truncate">
              {company?.company_name || 'المحاسبي Plus'}
            </div>
            <div className="text-[10px] text-[#8E8778] truncate">
              {user?.full_name} · {user?.role_name || user?.role_code}
            </div>
          </div>
          <button
            onClick={() => setSyncOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-[#D4AF37]"
            aria-label="المزامنة"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto pb-24">
        {activeModule === 'dashboard' && (
          <DashboardModule onNavigate={(k) => setActiveModule(k as any)} />
        )}
        {activeModule === 'master' && <MasterDataModule />}
        {activeModule === 'finance' && <FinanceModule />}
        {activeModule === 'sales' && <SalesModule />}
        {activeModule === 'purchases' && <PurchasesModule />}
        {activeModule === 'inventory' && <InventoryModule />}
        {activeModule === 'hr' && <HRModule />}
        {activeModule === 'reports' && <ReportsModule company={company} />}
      </main>

      {/* شريط تنقل سفلي بخاصية التطبيقات */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#08080C]/96 backdrop-blur border-t border-[#D4AF37]/30 safe-bottom">
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5">
          {navItems.slice(0, 5).map((item) => {
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key as any)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9.5px] font-bold transition ${
                  active
                    ? 'bg-[#D4AF37]/15 text-[#FCE79C] border border-[#D4AF37]/40'
                    : 'text-[#8E8778] border border-transparent'
                }`}
              >
                {item.short}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
          {navItems.slice(5).map((item) => {
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key as any)}
                className={`py-1.5 rounded-lg text-[9.5px] font-bold ${
                  active ? 'bg-[#D4AF37]/12 text-[#FCE79C]' : 'text-[#7E7869]'
                }`}
              >
                {item.short}
              </button>
            );
          })}
        </div>
      </nav>

      <SyncCenter open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
};
