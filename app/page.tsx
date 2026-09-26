import Image from "next/image";
import Link from "next/link";
import DeviceFinder from "./components/DeviceFinder";
import ProductCard from "./components/ProductCard";
import BundleCard from "./components/BundleCard";
import Reviews from "./components/Reviews";
import Reveal from "./components/Reveal";
import { products, categories, bundles } from "./lib/products";
import {
  ArrowLeftIcon,
  BoltIcon,
  CashIcon,
  FireIcon,
  GamepadIcon,
  HeadphonesIcon,
  PlayIcon,
  RefreshIcon,
  ShieldCheckIcon,
  StandIcon,
  StarIcon,
  TruckIcon,
  WhatsAppIcon,
} from "./components/icons";

const CATEGORY_ICONS = {
  protection: ShieldCheckIcon,
  power: BoltIcon,
  gaming: GamepadIcon,
  audio: HeadphonesIcon,
  mounts: StandIcon,
} as const;

const REELS = [
  { img: "/products/case.jpg", caption: "جراب Armor-X من ارتفاع 3 متر", views: "2.1M", time: "0:34" },
  { img: "/products/charger.jpg", caption: "شحن 50% في 20 دقيقة — تايمر حقيقي", views: "1.4M", time: "0:58" },
  { img: "/products/trigger.jpg", caption: "Trigger FSM — 4 كيلز متتالية", views: "3.2M", time: "0:21" },
  { img: "/products/earbuds.jpg", caption: "الـ ANC بيشتغل إزاي في الميترو", views: "980K", time: "0:45" },
];

export default function Home() {
  const trending = products.filter((p) => p.trending).slice(0, 6);
  const bestSellers = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8);

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-dots absolute inset-0" />
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-neon/10 blur-3xl" />

        <div className="container-x relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="chip border-neon/30 bg-neon/10 text-neon">
              <FireIcon size={14} />
              جديد كل أسبوع — الترند قبل الكل
            </span>
            <h1 className="mt-5 font-display text-4xl font-black leading-[1.15] text-snow sm:text-5xl lg:text-6xl">
              جهّز موبايلك لأقصى أداء..
              <span className="text-glow mt-2 block bg-gradient-to-l from-neon via-neon to-violet bg-clip-text text-transparent">
                حماية، أناقة، وسرعة بلا حدود!
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog">
              إكسسوارات مختارة بعناية للجيمرز والشباب — جرابات تتحمل، شواحن تسرع، وصوت يقصف.
              دفع عند الاستلام واستبدال فوري خلال 14 يوم.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-neon animate-pulse-glow font-display text-lg">
                اطلب الآن، وعيش التجربة
                <ArrowLeftIcon size={18} />
              </Link>
              <Link href="/#device-finder" className="btn-ghost">
                <BoltIcon size={18} className="text-neon" />
                اختار موبايلك
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-fog">
              <span className="flex items-center gap-2">
                <StarIcon size={16} className="text-neon" />
                <b className="text-snow">4.9</b> (+12 ألف تقييم)
              </span>
              <span className="flex items-center gap-2">
                <TruckIcon size={17} className="text-neon" />
                توصيل 24-48 ساعة
              </span>
              <span className="flex items-center gap-2">
                <RefreshIcon size={17} className="text-neon" />
                استبدال فوري 14 يوم
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-8 rounded-full bg-neon/15 blur-3xl" />
            <div className="animate-floaty relative overflow-hidden rounded-3xl border border-line shadow-[0_20px_80px_rgba(212,255,63,0.1)]">
              <Image
                src="/products/hero.jpg"
                alt="موبايل بإكسسوارات VOLT — جراب مضاد للصدمات وسماعات لاسلكية وشاحن سريع"
                width={1024}
                height={1024}
                priority
                className="h-auto w-full"
              />
            </div>
            <span className="chip animate-floaty absolute right-0 top-6 border-neon/40 bg-ink/85 backdrop-blur" style={{ animationDelay: "0.8s" }}>
              <BoltIcon size={14} className="text-neon" />
              شحن 45W
            </span>
            <span className="chip animate-floaty absolute bottom-10 right-2 border-violet/40 bg-ink/85 backdrop-blur" style={{ animationDelay: "1.6s" }}>
              <HeadphonesIcon size={14} className="text-violet" />
              ANC -35dB
            </span>
            <span className="chip animate-floaty absolute bottom-24 left-0 border-mint/40 bg-ink/85 backdrop-blur" style={{ animationDelay: "2.2s" }}>
              <ShieldCheckIcon size={14} className="text-mint" />
              حماية 9H
            </span>
          </div>
        </div>
      </section>

      {/* ===== شريط المميزات ===== */}
      <section className="border-b border-line bg-panel/50">
        <div className="container-x grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {[
            { Icon: CashIcon, t: "الدفع عند الاستلام", d: "ادفع وأنت مستلم طلبك" },
            { Icon: RefreshIcon, t: "استبدال خلال 14 يوم", d: "من غير أسئلة معقدة" },
            { Icon: TruckIcon, t: "شحن سريع لكل المحافظات", d: "توصيل خلال 24-48 ساعة" },
            { Icon: WhatsAppIcon, t: "دعم واتساب سريع", d: "بنرد عليك في دقايق" },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neon/10 text-neon">
                <Icon size={22} />
              </span>
              <div>
                <div className="text-sm font-bold text-snow">{t}</div>
                <div className="text-xs text-fog">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== محدد طراز الهاتف ===== */}
      <DeviceFinder />

      {/* ===== التصنيفات ===== */}
      <section className="py-14">
        <div className="container-x">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="section-title">اتسوّق على مزاجك</h2>
                <p className="mt-2 text-fog">خمس عوالم جاهزة تنقلك فيهم بأقل كليك</p>
              </div>
              <Link
                href="/products"
                className="flex items-center gap-1.5 text-sm font-bold text-neon transition-colors hover:brightness-110"
              >
                كل المنتجات
                <ArrowLeftIcon size={16} />
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c, i) => {
              const Icon = CATEGORY_ICONS[c.key];
              return (
                <Reveal key={c.key} delay={i * 70}>
                  <Link
                    href={`/products?category=${c.key}`}
                    className="card group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-[0_8px_40px_rgba(212,255,63,0.08)]"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neon/10 text-neon transition-colors group-hover:bg-neon group-hover:text-ink">
                      <Icon size={26} />
                    </span>
                    <h3 className="mt-4 font-display font-black text-snow">{c.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fog">{c.desc}</p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== الترند ===== */}
      <section className="border-y border-line bg-panel/30 py-14">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <FireIcon size={26} className="text-neon" />
                الترند دلوقتي
              </h2>
              <p className="mt-2 text-fog">اللي الجيمرز والكونتنت كريتورز بيتجننوا عليه على تيك توك وإنستغرام</p>
            </div>
            <Link
              href="/products?tag=trending"
              className="flex items-center gap-1.5 text-sm font-bold text-neon transition-colors hover:brightness-110"
            >
              شوف الترند كله
              <ArrowLeftIcon size={16} />
            </Link>
          </div>

          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
            {trending.map((p) => (
              <div key={p.id} className="w-44 shrink-0 snap-start sm:w-56">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== البكدجات ===== */}
      <section className="py-14">
        <div className="container-x">
          <Reveal>
            <div className="mb-8 text-center">
              <h2 className="section-title">عروض الحزم — وفّر واكسب</h2>
              <p className="mt-2 text-fog">كومبو كامل بسعر أقل من شراء كل قطعة لوحدها</p>
            </div>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((b, i) => (
              <Reveal key={b.id} delay={i * 90}>
                <BundleCard bundle={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== الأكثر مبيعاً ===== */}
      <section className="border-y border-line bg-panel/30 py-14">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="section-title">الأكثر طلباً هذا الشهر</h2>
            <Link
              href="/products"
              className="flex items-center gap-1.5 text-sm font-bold text-neon transition-colors hover:brightness-110"
            >
              كل المنتجات
              <ArrowLeftIcon size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== الريلز ===== */}
      <section className="py-14">
        <div className="container-x">
          <div className="mb-8 text-center">
            <h2 className="section-title">شوف بعينك</h2>
            <p className="mt-2 text-fog">
              فيديوهات حقيقية من الاختبارات — الجراب بيترمي والشاحن بيتحط على التايمر
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {REELS.map((r, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-line">
                  <Image
                    src={r.img}
                    alt={r.caption}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-neon/90 text-ink shadow-[0_0_30px_rgba(212,255,63,.5)] transition-transform group-hover:scale-110">
                      <PlayIcon size={22} />
                    </span>
                  </span>
                  <span className="absolute left-2 top-2 rounded-lg bg-ink/80 px-2 py-1 text-[10px] font-bold text-fog backdrop-blur" dir="ltr">
                    {r.time}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-sm font-bold leading-snug text-snow">{r.caption}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-fog">
                      <FireIcon size={11} className="text-neon" />
                      {r.views} مشاهدة على تيك توك
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== التقييمات ===== */}
      <div className="border-y border-line bg-panel/30">
        <Reviews />
      </div>

      {/* ===== CTA نهائي ===== */}
      <section className="py-16">
        <div className="container-x">
          <Reveal>
            <div className="bg-dots card relative overflow-hidden p-8 text-center sm:p-12">
              <div className="absolute -top-20 right-1/4 h-48 w-48 rounded-full bg-neon/15 blur-3xl" />
              <div className="absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-violet/20 blur-3xl" />
              <div className="relative">
                <h2 className="font-display text-3xl font-black text-snow sm:text-4xl">
                  موبايلك يستاهل <span className="text-glow text-neon">الأحسن.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-fog">
                  اطلب النهاردة — الدفع عند الاستلام، والتوصيل خلال 48 ساعة، والاستبدال فوري لو
                  أي حاجة مش عجباتك.
                </p>
                <Link href="/products" className="btn-neon animate-pulse-glow mt-7 font-display text-lg">
                  اطلب الآن، وعيش التجربة
                  <ArrowLeftIcon size={18} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
