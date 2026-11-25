import React, { useEffect, useState } from 'react';
import {
  Settings2,
  LayoutDashboard,
  Database,
  Landmark,
  ShoppingCart,
  Truck,
  Package,
  Users,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { apiFetch, getStoredToken, setStoredToken } from './lib/api';
import { PlusBrandLockup, PlusCrossEmblem, PlusSpinner, PlusWatermark } from './components/BrandIdentity';
import { LoginScreen } from './components/LoginScreen';
import { DataModeBadge } from './components/DataModeBadge';
import { OfflineSettings } from './components/OfflineSettings';
import { DashboardModule, ModuleKey } from './modules/DashboardModule';
import { MasterDataModule } from './modules/MasterDataModule';
import { FinanceModule } from './modules/FinanceModule';
import { SalesModule } from './modules/SalesModule';
import { PurchasesModule } from './modules/PurchasesModule';
import { InventoryModule } from './modules/InventoryModule';
import { HRModule } from './modules/HRModule';
import { ReportsModule } from './modules/ReportsModule';

const NAV_ITEMS: { key: ModuleKey; label: string; icon: React.ReactNode; permKey?: string }[] = [
  { key: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'master', label: '1. البيانات الأساسية', icon: <Database className="w-4 h-4" />, permKey: 'master' },
  { key: 'finance', label: '2. الإدارة المالية', icon: <Landmark className="w-4 h-4" />, permKey: 'finance' },
  { key: 'sales', label: '3. المبيعات والعملاء', icon: <ShoppingCart className="w-4 h-4" />, permKey: 'sales' },
  { key: 'purchases', label: '4. المشتريات والموردين', icon: <Truck className="w-4 h-4" />, permKey: 'purchases' },
  { key: 'inventory', label: '5. المخزون السلعي', icon: <Package className="w-4 h-4" />, permKey: 'inventory' },
  { key: 'hr', label: '6. الموارد البشرية', icon: <Users className="w-4 h-4" />, permKey: 'hr' },
  { key: 'reports', label: 'التقارير والقوائم الختامية', icon: <FileBarChart2 className="w-4 h-4" />, permKey: 'reports' },
];

export const App: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const minSplash = new Promise((r) => setTimeout(r, 850));
      try {
        if (getStoredToken()) {
          const me = await apiFetch('/api/auth/me');
          await minSplash;
          setUser(me.user);
          setCompany(me.company);
          setBooting(false);
          return;
        }
        // تهيئة جلسة افتراضية سريعة لرئيس الحسابات لتسهيل المعاينة المباشرة مع إمكانية تبديل الحساب بأي وقت
        const auto = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'accountant', password: 'plus123', portal: 'ERP' }),
        });
        setStoredToken(auto.token);
        await minSplash;
        setUser(auto.user);
        setCompany(auto.company);
      } catch {
        setStoredToken(null);
      } finally {
        setBooting(false);
      }
    };
    init();
  }, []);

  const handleModuleSwitch = (mod: ModuleKey) => {
    setMobileNavOpen(false);
    if (mod === activeModule) return;
    setTransitioning(true);
    setActiveModule(mod);
    setTimeout(() => setTransitioning(false), 320);
  };

  if (booting) {
    return (
      <PlusSpinner
        fullScreen
        size={88}
        label="المحاسبي Plus — جارٍ تشغيل محرك الحسابات وقواعد البيانات..."
      />
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={({ user: u, company: c }) => {
          setUser(u);
          setCompany(c);
          setActiveModule('dashboard');
        }}
      />
    );
  }

  const currency = company?.currency || 'ج.م';
  const currentNav = NAV_ITEMS.find((n) => n.key === activeModule);

  return (
    <div className="min-h-screen bg-[#060608] text-[#F7F3E8] relative flex flex-col lg:flex-row">
      {/* العلامة المائية الخلفية بنفس شكل علامة الزائد الذهبية في الشعار */}
      <PlusWatermark />

      {/* القائمة الجانبية الثابتة بالأسود والذهبي */}
      <aside
        className={`no-print fixed lg:sticky top-0 right-0 z-40 h-screen w-72 bg-[#09090D]/95 backdrop-blur-xl border-l border-[#D4AF37]/25 flex flex-col justify-between transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 flex items-center justify-between">
            <PlusBrandLockup subtitle="نظم المعلومات المحاسبية ERP" />
            <button onClick={() => setMobileNavOpen(false)} className="lg:hidden text-[#D4AF37]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-210px)]">
            {NAV_ITEMS.map((item) => {
              const allowed =
                !item.permKey ||
                user.role_code === 'SUPER_ADMIN' ||
                user.permissions?.[item.permKey]?.view !== false;
              const isActive = activeModule === item.key;

              return (
                <button
                  key={item.key}
                  disabled={!allowed}
                  onClick={() => handleModuleSwitch(item.key)}
                  className={`w-full text-right px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'gold-metallic-btn shadow-lg'
                      : allowed
                      ? 'text-[#DFD7C4] hover:bg-[#D4AF37]/10 hover:text-[#FCE79C]'
                      : 'opacity-35 cursor-not-allowed text-[#7C7565]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {!allowed && <span className="text-[10px]">مقيد</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#07070A] space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#FAF5E8] truncate">{user.full_name}</div>
              <div className="text-[11px] text-[#E5C158] truncate">{user.role_name}</div>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>إعدادات البيانات والتخزين</span>
          </button>
          <button
            onClick={() => {
              setStoredToken(null);
              setUser(null);
            }}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-red-950/40 border border-[#D4AF37]/25 hover:border-red-500/40 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>تبديل الموظف / تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 min-w-0 relative z-10 flex flex-col">
        {/* الشريط العلوي */}
        <header className="no-print sticky top-0 z-30 bg-[#08080C]/90 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 md:px-7 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base md:text-lg font-extrabold gold-gradient-text">
                {currentNav?.label || 'المحاسبي Plus'}
              </h1>
              <p className="text-[11px] text-[#9E9682]">
                {company?.company_name} • السنة المالية {company?.fiscal_year || 2026}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DataModeBadge />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101016] border border-[#D4AF37]/25 text-xs">
              <PlusCrossEmblem size={20} idPrefix="hdr-cross" className={transitioning ? 'animate-plus-spin-fast' : ''} />
              <span className="font-royal text-[#E5C158] font-bold">PLUS ERP</span>
            </div>
          </div>
        </header>

        {/* ساحة العرض */}
        <main className="p-4 md:p-7 flex-1">
          {transitioning ? (
            <PlusSpinner size={64} label="جارٍ فتح الوحدة المحاسبية..." />
          ) : (
            <>
              {activeModule === 'dashboard' && <DashboardModule onNavigate={handleModuleSwitch} currency={currency} />}
              {activeModule === 'master' && <MasterDataModule currency={currency} />}
              {activeModule === 'finance' && <FinanceModule currency={currency} />}
              {activeModule === 'sales' && <SalesModule currency={currency} />}
              {activeModule === 'purchases' && <PurchasesModule currency={currency} />}
              {activeModule === 'inventory' && <InventoryModule currency={currency} />}
              {activeModule === 'hr' && <HRModule currency={currency} />}
              {activeModule === 'reports' && <ReportsModule company={company} currency={currency} />}
            </>
          )}
        </main>
      </div>

      <OfflineSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
