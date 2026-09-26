import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuyBox from "../../components/BuyBox";
import LookBundle from "../../components/LookBundle";
import ProductCard from "../../components/ProductCard";
import Reviews from "../../components/Reviews";
import JsonLd from "../../components/JsonLd";
import {
  ArrowLeftIcon,
  CashIcon,
  CheckCircleIcon,
  FireIcon,
  RefreshIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
} from "../../components/icons";
import { categories, getProduct, products } from "../../lib/products";

export function generateStaticParams() {
  return products.map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getProduct(Number(id));
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.desc} — EGP ${p.price} من VOLT. دفع عند الاستلام واستبدال خلال 14 يوم.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product) notFound();

  const categoryName = categories.find((c) => c.key === product.category)?.name ?? "";
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltstore.eg";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.desc,
    image: [`${siteUrl}${product.img ?? "/products/hero.jpg"}`],
    sku: `VOLT-${product.id}`,
    brand: { "@type": "Brand", name: "VOLT" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/product/${product.id}`,
    },
  };

  return (
    <div className="container-x py-8">
      <JsonLd data={productJsonLd} />
      {/* المسار */}
      <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-xs text-fog">
        <Link href="/" className="transition-colors hover:text-neon">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/products" className="transition-colors hover:text-neon">
          المنتجات
        </Link>
        <span>/</span>
        <Link href={`/products?category=${product.category}`} className="transition-colors hover:text-neon">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-snow">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* الصورة */}
        <div className="card relative aspect-square overflow-hidden">
          {product.img ? (
            <Image
              src={product.img}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="bg-dots absolute inset-0 grid place-items-center text-fog">
              <TagIcon size={80} />
            </div>
          )}
          {off > 0 && (
            <span className="absolute right-3 top-3 rounded-xl bg-danger px-3 py-1.5 text-sm font-black text-white">
              خصم {off}%
            </span>
          )}
          {product.trending && (
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-xl bg-ink/85 px-3 py-1.5 text-sm font-black text-neon backdrop-blur">
              <FireIcon size={15} />
              ترند تيك توك
            </span>
          )}
        </div>

        {/* التفاصيل */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{categoryName}</span>
            {product.trending && (
              <span className="chip border-neon/30 bg-neon/10 text-neon">
                <FireIcon size={13} />
                ترند
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-2xl font-black leading-snug text-snow sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  size={16}
                  className={i < Math.round(product.rating) ? "text-neon" : "text-line"}
                />
              ))}
            </div>
            <span className="text-sm text-fog">
              {product.rating} ({product.reviews.toLocaleString("en")} تقييم)
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="font-display text-4xl font-black text-neon">EGP {product.price}</span>
            {product.oldPrice && (
              <>
                <span className="text-lg text-fog line-through">{product.oldPrice}</span>
                <span className="rounded-lg bg-mint/15 px-2.5 py-1 text-sm font-bold text-mint">
                  وفّر EGP {product.oldPrice - product.price}
                </span>
              </>
            )}
          </div>

          <p className="mt-4 leading-relaxed text-fog">{product.desc}</p>

          {product.colors && (
            <div className="mt-5">
              <span className="label">اللون</span>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <span
                    key={c}
                    className="h-9 w-9 rounded-full border-2 border-line"
                    style={{ backgroundColor: c }}
                    aria-label={`اللون ${c}`}
                  />
                ))}
              </div>
            </div>
          )}

          <BuyBox product={product} />

          {/* المميزات */}
          <ul className="mt-8 space-y-2.5">
            {product.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-snow">
                <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-mint" />
                {f}
              </li>
            ))}
          </ul>

          {/* الثقة */}
          <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-line bg-panel p-4 text-center">
            <div>
              <TruckIcon size={22} className="mx-auto text-neon" />
              <div className="mt-1.5 text-xs font-bold text-snow">توصيل 24-48 ساعة</div>
            </div>
            <div>
              <RefreshIcon size={22} className="mx-auto text-neon" />
              <div className="mt-1.5 text-xs font-bold text-snow">استبدال 14 يوم</div>
            </div>
            <div>
              <CashIcon size={22} className="mx-auto text-neon" />
              <div className="mt-1.5 text-xs font-bold text-snow">دفع عند الاستلام</div>
            </div>
          </div>
        </div>
      </div>

      {/* أكمل الإكسسوار */}
      <LookBundle product={product} />

      {/* التقييمات */}
      <div className="mt-14">
        <Reviews title="تقييمات المنتج" />
      </div>

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">زيه بس مختلف</h2>
            <Link
              href={`/products?category=${product.category}`}
              className="flex items-center gap-1.5 text-sm font-bold text-neon hover:brightness-110"
            >
              شوف القسم كله
              <ArrowLeftIcon size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
