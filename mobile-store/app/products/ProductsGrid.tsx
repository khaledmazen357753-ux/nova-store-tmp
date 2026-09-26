"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { categories, products } from "../lib/products";
import { isCompatible } from "../lib/products";
import { useStore } from "../lib/store";
import ProductCard from "../components/ProductCard";
import { FireIcon, PhoneIcon, SearchIcon, XIcon } from "../components/icons";

export default function ProductsGrid() {
  const params = useSearchParams();
  const { device, setDevice } = useStore();
  const categoryParam = params.get("category") ?? "all";
  const trendingOnly = params.get("tag") === "trending";
  const deviceFilter = params.get("filter") === "device";
  const [cat, setCat] = useState(categoryParam);

  useEffect(() => setCat(categoryParam), [categoryParam]);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (!trendingOnly || p.trending) &&
          (!deviceFilter || isCompatible(p, device))
      ),
    [cat, trendingOnly, deviceFilter, device]
  );

  return (
    <div className="container-x py-8">
      {/* الهيدر */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-black text-snow sm:text-3xl">
          {trendingOnly ? "الترند دلوقتي" : "كل المنتجات"}
        </h1>
        {trendingOnly && (
          <span className="chip border-neon/30 bg-neon/10 text-neon">
            <FireIcon size={14} />
            الأعلى طلباً
          </span>
        )}
        <span className="text-sm text-fog">({list.length} منتج)</span>
        {trendingOnly && (
          <Link
            href="/products"
            className="mr-auto flex items-center gap-1 text-xs font-bold text-fog transition-colors hover:text-neon"
          >
            <XIcon size={13} />
            شيل فلتر الترند
          </Link>
        )}
      </div>

      {/* بانر فلتر الجهاز */}
      {deviceFilter && device && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-mint/30 bg-mint/5 p-4">
          <PhoneIcon size={18} className="text-mint" />
          <span className="text-sm text-snow">
            بنعرضلك المتوافق مع <b className="text-mint">{device}</b> بس
          </span>
          <button
            onClick={() => setDevice(null)}
            className="mr-auto text-xs font-bold text-fog underline-offset-4 transition-colors hover:text-danger hover:underline"
          >
            امسح الجهاز وشوف الكل
          </button>
        </div>
      )}
      {deviceFilter && !device && (
        <div className="mt-4 rounded-2xl border border-line bg-panel p-4 text-sm text-fog">
          اختار موبايلك الأول من{" "}
          <Link href="/#device-finder" className="font-bold text-neon hover:underline">
            محدد طراز الهاتف
          </Link>{" "}
          عشان نفلترلك المتوافق — أو تصفح كل المنتجات تحت.
        </div>
      )}

      {/* شرائح التصنيفات */}
      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          onClick={() => setCat("all")}
          className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
            cat === "all"
              ? "border-neon bg-neon text-ink"
              : "border-line bg-panel text-fog hover:border-neon/40 hover:text-snow"
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              cat === c.key
                ? "border-neon bg-neon text-ink"
                : "border-line bg-panel text-fog hover:border-neon/40 hover:text-snow"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* الشبكة */}
      {list.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="card mt-8 flex flex-col items-center p-12 text-center">
          <SearchIcon size={56} className="text-fog" />
          <h2 className="mt-4 font-display text-xl font-black text-snow">مفيش نتايج بالمواصفات دي</h2>
          <p className="mt-2 text-sm text-fog">
            {deviceFilter && device
              ? "جرّب تمسح فلتر الجهاز — أو شوف تصنيف تاني"
              : "جرّب تصنيف تاني أو شوف كل المنتجات"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {deviceFilter && device && (
              <button onClick={() => setDevice(null)} className="btn-ghost">
                امسح فلتر الجهاز
              </button>
            )}
            <Link href="/products" className="btn-neon">
              شوف كل المنتجات
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
