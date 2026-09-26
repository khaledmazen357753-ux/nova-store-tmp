"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "../lib/store";
import {
  BagIcon,
  BoltIcon,
  CashIcon,
  ChevronDownIcon,
  ClockIcon,
  GridIcon,
  HomeIcon,
  MenuIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TruckIcon,
  XIcon,
} from "./icons";

const marqueeItems = [
  { t: "شحن سريع لجميع المحافظات", Icon: TruckIcon },
  { t: "ضمان استبدال فوري خلال 14 يوم", Icon: ShieldCheckIcon },
  { t: "الدفع عند الاستلام متاح", Icon: CashIcon },
  { t: "توصيل خلال 24-48 ساعة", Icon: ClockIcon },
];

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "المنتجات" },
  { href: "/products?tag=trending", label: "الترند" },
  { href: "/track", label: "تتبع الطلب" },
  { href: "/returns", label: "الاستبدال" },
];

export default function Navigation() {
  const { count, device, setDevice } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40">
        {/* شريط الثقة العلوي — marquee متحرك */}
        <div className="marquee-wrap overflow-hidden border-b border-line bg-panel-2 py-2 text-xs text-fog">
          <div className="animate-marquee flex w-max items-center gap-10">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
                {marqueeItems.map(({ t, Icon }, i) => (
                  <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                    <Icon size={15} className="text-neon" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* القائمة الرئيسية */}
        <nav className="border-b border-line bg-ink/85 backdrop-blur-md">
          <div className="container-x flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="VOLT — الرئيسية">
              <span className="neon-glow grid h-9 w-9 place-items-center rounded-xl bg-neon text-ink">
                <BoltIcon size={20} />
              </span>
              <span className="leading-none">
                <span className="font-display text-xl font-black tracking-wide text-snow">VOLT</span>
                <span className="block text-[10px] text-fog">إكسسوارات موبايل</span>
              </span>
            </Link>

            <div className="hidden items-center gap-6 lg:flex">
              {links.map((l) => {
                const active =
                  l.href === "/"
                    ? pathname === "/"
                    : pathname === l.href.split("?")[0] && !l.href.includes("tag=");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`text-sm font-bold transition-colors hover:text-neon ${
                      active ? "text-neon" : "text-fog"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              {device && (
                <span className="chip hidden sm:inline-flex">
                  <PhoneIcon size={14} className="text-neon" />
                  {device}
                  <button
                    onClick={() => setDevice(null)}
                    aria-label="امسح اختيار الجهاز"
                    className="text-fog transition-colors hover:text-danger"
                  >
                    <XIcon size={13} />
                  </button>
                </span>
              )}
              <Link
                href="/cart"
                aria-label={`سلة المشتريات — ${count} منتج`}
                className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel text-snow transition-colors hover:border-neon/50 hover:text-neon"
              >
                <BagIcon size={20} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-neon text-[11px] font-black text-ink">
                    {count}
                  </span>
                )}
              </Link>
              <button
                className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel text-snow transition-colors hover:border-neon/50 hover:text-neon lg:hidden"
                onClick={() => setOpen(!open)}
                aria-label={open ? "اقفل القائمة" : "افتح القائمة"}
                aria-expanded={open}
              >
                {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
              </button>
            </div>
          </div>

          {open && (
            <div className="border-t border-line bg-ink px-4 py-4 lg:hidden">
              <div className="container-x flex flex-col gap-1 px-0">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-snow transition-colors hover:bg-panel hover:text-neon"
                  >
                    {l.label}
                    <ChevronDownIcon size={16} className="-rotate-90 text-fog" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* شريط التنقل السفلي — موبايل فقط (Mobile-First بيد واحدة) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-line bg-panel/95 backdrop-blur-md lg:hidden"
        aria-label="التنقل السريع"
      >
        {[
          { href: "/", label: "الرئيسية", Icon: HomeIcon, exact: true },
          { href: "/products", label: "المنتجات", Icon: GridIcon, exact: false },
          { href: "/cart", label: "السلة", Icon: BagIcon, exact: true, badge: true },
          { href: "/track", label: "تتبع", Icon: TruckIcon, exact: true },
        ].map(({ href, label, Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                active ? "text-neon" : "text-fog"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={21} />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -left-2 grid h-4 min-w-4 place-items-center rounded-full bg-neon px-1 text-[9px] font-black text-ink">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
