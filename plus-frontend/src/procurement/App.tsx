import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Receipt,
  RotateCcw,
  Boxes,
  FileBarChart2,
  ShieldCheck,
  Truck,
  LogOut,
  Menu,
  X,
  Download,
  WifiOff,
  ArrowUpLeft,
} from 'lucide-react';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api';
import { canWrite, persistNow } from '../offline/engine';
import { ProcurementLogin } from './ProcurementLogin';
import { Dashboard } from './pages/Dashboard';
import { Suppliers } from './pages/Suppliers';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { PurchaseInvoices } from './pages/PurchaseInvoices';
import { ReturnsPayments } from './pages/ReturnsPayments';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { ChangeRequestsPage } from './pages/ChangeRequests';

/**
 * هيكل موقع المشتريات.
 *
 * ترتيب القائمة يتبع دورة العمل الفعلية، لا ترتيب الجداول:
 *   أوامر التوريد ← استلام بفاتورة ← (رد أو سداد) ← أثر على المخزون
 * فالمستخدم يمشي في الشاشات كما يمشي في العمل.
 */

type PageKey =
  | 'dashboard'
  | 'suppliers'
  | 'purchase-orders'
  | 'purchase-invoices'
  | 'returns-payments'
  | 'inventory'
  | 'reports'
  | 'change-requests';

const NAV: { key: PageKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'dashboard', label: 'لوحة المشتريات', icon: <LayoutDashboard className="w-4 h-4" />, hint: 'المؤشرات والتنبيهات' },
  { key: 'suppliers', label: 'الموردون', icon: <Building2 className="w-4 h-4" />, hint: 'الأرصدة والكشوف' },
  { key: 'purchase-orders', label: 'أوامر التوريد', icon: <ClipboardList className="w-4 h-4" />, hint: 'PO والتوريد المتوقع' },
  { key: 'purchase-invoices', label: 'فواتير الشراء', icon: <Receipt className="w-4 h-4" />, hint: 'استلام وقيد يومية' },
  { key: 'returns-payments', label: 'الرد والسداد', icon: <RotateCcw className="w-4 h-4" />, hint: 'مردودات ومدفوعات' },
  { key: 'inventory', label: 'المخازن', icon: <Boxes className="w-4 h-4" />, hint: 'أذون وبطاقات أصناف' },
  { key: 'reports', label: 'التقارير', icon: <FileBarChart2 className="w-4 h-4" />, hint: 'ميزان وكشوف ومطابقة' },
  { key: 'change-requests', label: 'طلبات التعديل', icon: <ShieldCheck className="w-4 h-4" />, hint: 'تعديلات بموافقة' },
];

export const ProcurementApp: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  // إعادة فتح الجلسة عند تحديث الصفحة
  useEffect(() => {
    (async () => {
      try {
        if (getStoredToken()) {
          const me = await apiFetch('/api/auth/me');
          setUser(me.user);
          setCompany(me.company);
        }
      } catch {
        setStoredToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // عدّاد الطلبات المعلّقة — يُحدَّث عند تبديل الشاشة فقط، لا باستقصاء دوري
  useEffect(() => {
    if (!user) return;
    apiFetch('/api/change-requests')
      .then((res) => setPending((res.requests || []).filter((r: any) => r.status === 'pending').length))
      .catch(() => undefined);
  }, [user, page, refreshKey]);

  // مؤشر الاتصال — للنظام أوفلاين، فقدان الشبكة لا يعني فقدان البيانات
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setCompany(null);
    setPage('dashboard');
  };

  const exportBackup = async () => {
    try {
      await persistNow();
      const { exportSqliteFile } = await import('../offline/engine');
      const bytes = await exportSqliteFile();
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plus-procurement-${new Date().toISOString().slice(0, 10)}.sqlite`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(`تعذّر تصدير نسخة البيانات: ${err.message}`);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37] animate-plus-spin-fast" />
        <div className="text-[#D4AF37] text-xs font-bold">جارٍ تشغيل محرك بيانات المشتريات…</div>
        <div className="text-[10px] text-[#6F6A5D]">
          نفس محرك SQLite المحاسبي — بلا إنترنت وبلا خادم
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ProcurementLogin
        onSuccess={(session) => {
          setUser(session.user);
          setCompany(session.company);
          setPending(0);
        }}
      />
    );
  }

  const currency = company?.currency || 'ج.م';
  const writable = canWrite();
  const current = NAV.find((n) => n.key === page)!;
  const mayWritePurchases = Boolean(user?.permissions?.purchases?.add) || user?.role_code === 'SUPER_ADMIN';
  const mayWriteInventory = Boolean(user?.permissions?.inventory?.add) || user?.role_code === 'SUPER_ADMIN';

  const render = () => {
    const bump = () => setRefreshKey((k) => k + 1);
    switch (page) {
      case 'dashboard':
        return <Dashboard currency={currency} onNavigate={(k) => setPage(k as PageKey)} />;
      case 'suppliers':
        return <Suppliers currency={currency} canWrite={writable} />;
      case 'purchase-orders':
        return <PurchaseOrders currency={currency} canWrite={writable && mayWritePurchases} onCreated={bump} />;
      case 'purchase-invoices':
        return <PurchaseInvoices currency={currency} canWrite={writable && mayWritePurchases} onCreated={bump} />;
      case 'returns-payments':
        return <ReturnsPayments currency={currency} canWrite={writable && mayWritePurchases} onCreated={bump} />;
      case 'inventory':
        return <Inventory currency={currency} canWrite={writable && mayWriteInventory} onCreated={bump} />;
      case 'reports':
        return <Reports currency={currency} />;
      case 'change-requests':
        return <ChangeRequestsPage user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#F7F3E8] flex flex-col lg:flex-row">
      {/* القائمة الجانبية */}
      <aside
        className={`${
          navOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-64 shrink-0 bg-[#0A0A0E] border-l border-[#D4AF37]/20 lg:min-h-screen`}
      >
        <div className="p-4 border-b border-[#D4AF37]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F3D77D] to-[#A57D1E] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-[#09090B]" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold gold-gradient-text truncate">المشتريات والمخازن</div>
              <div className="text-[9px] text-[#6F6A5D] tracking-wider">PROCUREMENT SUITE</div>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-lg bg-[#0F0F14] border border-[#D4AF37]/12">
            <div className="text-[10px] text-[#F7F3E8] font-bold truncate">{company?.company_name}</div>
            <div className="text-[9px] text-[#6F6A5D] mt-0.5">سنة مالية {company?.fiscal_year}</div>
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setPage(item.key);
                setNavOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition cursor-pointer ${
                page === item.key
                  ? 'bg-[#D4AF37]/12 text-[#E5C158] border border-[#D4AF37]/35'
                  : 'text-[#A9A292] hover:bg-[#12121A] hover:text-[#F7F3E8] border border-transparent'
              }`}
            >
              <span className={page === item.key ? 'text-[#D4AF37]' : 'text-[#7C7565]'}>{item.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold truncate">{item.label}</span>
                <span className="block text-[9px] text-[#6F6A5D] truncate">{item.hint}</span>
              </span>
              {item.key === 'change-requests' && pending > 0 && (
                <span className="text-[9px] font-bold bg-[#D4AF37] text-[#09090B] rounded-full px-1.5 py-0.5 shrink-0">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 mt-2 border-t border-[#D4AF37]/12 space-y-2">
          <div className="text-[10px] text-[#F7F3E8] font-bold truncate">{user.full_name}</div>
          <div className="text-[9px] text-[#6F6A5D]">{user.role_name}</div>
          {/*
            الرجوع إلى النظام الكامل.
            قاعدة بيانات هذا الموقع منفصلة، والجلسة منفصلة — فالانتقال هنا
            مجرّد تنقّل بين صفحتين، لا تصدير بيانات ولا مشاركة توكن.
          */}
          <a
            href="/"
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-[#12121A] border border-[#D4AF37]/25 text-[9px] text-[#A9A292] hover:text-[#E5C158] hover:border-[#D4AF37]/50 cursor-pointer transition-colors"
            title="النظام المحاسبي الكامل — له بياناته وجلسته المستقلة"
          >
            <ArrowUpLeft className="w-3 h-3" /> النظام الكامل
          </a>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={exportBackup}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#12121A] border border-[#D4AF37]/20 text-[9px] text-[#A9A292] hover:text-[#E5C158] cursor-pointer"
              title="تصدير نسخة من قاعدة البيانات"
            >
              <Download className="w-3 h-3" /> نسخة
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#12121A] border border-red-900/40 text-[9px] text-red-300 hover:bg-red-950/40 cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> خروج
            </button>
          </div>
          {!writable && (
            <div className="text-[9px] text-amber-300 leading-relaxed p-1.5 rounded bg-amber-950/30 border border-amber-800/40">
              تبويب للعرض فقط — التبويب الآخر هو النشط للكتابة
            </div>
          )}
        </div>
      </aside>

      {/* المحتوى */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 bg-[#060608]/95 backdrop-blur border-b border-[#D4AF37]/15 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setNavOpen((v) => !v)}
                className="lg:hidden text-[#D4AF37] cursor-pointer shrink-0"
                aria-label="القائمة"
              >
                {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-[#F7F3E8] truncate">{current.label}</h1>
                <p className="text-[10px] text-[#6F6A5D] truncate">{current.hint}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!online && (
                <span className="flex items-center gap-1 text-[9px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-lg">
                  <WifiOff className="w-3 h-3" /> بلا إنترنت — يعمل
                </span>
              )}
              <span className="hidden sm:inline text-[9px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded-lg">
                أوفلاين · بياناتك على جهازك
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-[11px] flex justify-between gap-2">
              <span>{error}</span>
              <button onClick={() => setError('')} className="opacity-70 hover:opacity-100 cursor-pointer">
                ✕
              </button>
            </div>
          )}
          <div key={`${page}-${refreshKey}`}>{render()}</div>
        </div>
      </main>
    </div>
  );
};
