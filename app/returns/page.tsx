import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  RefreshIcon,
  TruckIcon,
  WhatsAppIcon,
} from "../components/icons";

export const metadata: Metadata = {
  title: "الاستبدال والاسترجاع",
  description:
    "استبدال أو استرجاع خلال 14 يوماً بدون أسئلة معقدة — سياسة VOLT الواضحة والبسيطة.",
};

const STEPS = [
  {
    n: "1",
    t: "اطلب الاستبدال",
    d: "كلمنا واتساب برقم طلبك وقولنا المشكلة — بنرد في دقايق خلال مواعيد العمل.",
  },
  {
    n: "2",
    t: "التسليم",
    d: "سلّم المنتج للمندوب وقت التوصيل الجديد، أو شحنه لأي فرع قريب منك.",
  },
  {
    n: "3",
    t: "استلم البديل أو فلوسك",
    d: "البديل بيوصلك فوراً، والاسترجاع بيرجع بنفس طريقة الدفع خلال 3 أيام عمل.",
  },
];

const CONDITIONS = [
  "المنتج بحالته الأصلية وبعلبه وكل ملحقاته",
  "الاستبدال خلال 14 يوم من تاريخ الاستلام",
  "المنتجات المعيبة من المصنع بتتستبدل فوراً ومن غير أي رسوم",
  "لازم فاتورة أو رقم الطلب موجود",
];

export default function ReturnsPage() {
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neon/10 text-neon">
            <RefreshIcon size={30} />
          </span>
          <h1 className="mt-5 font-display text-3xl font-black text-snow sm:text-4xl">
            استبدال واسترجاع خلال <span className="text-glow text-neon">14 يوم</span>
          </h1>
          <p className="mt-3 text-lg text-fog">من غير أسئلة معقدة — حقك محفوظ، وبس.</p>
        </div>

        {/* الخطوات */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="card relative p-5">
              <span className="absolute -top-3 right-4 grid h-8 w-8 place-items-center rounded-lg bg-neon font-display text-sm font-black text-ink">
                {s.n}
              </span>
              <h2 className="mt-2 font-display font-black text-snow">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fog">{s.d}</p>
              {i < STEPS.length - 1 && (
                <span className="absolute -left-2 top-1/2 hidden text-line sm:block" aria-hidden="true">
                  ←
                </span>
              )}
            </div>
          ))}
        </div>

        {/* الشروط */}
        <div className="card mt-6 p-6">
          <h2 className="font-display text-lg font-black text-snow">شروط بسيطة ومفهومة</h2>
          <ul className="mt-4 space-y-3">
            {CONDITIONS.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm text-snow">
                <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-mint" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* دعوة للتواصل */}
        <div className="card mt-6 flex flex-col items-center gap-4 p-8 text-center">
          <TruckIcon size={36} className="text-neon" />
          <h2 className="font-display text-xl font-black text-snow">
            عندك مشكلة في طلب؟ خلّينا نحلها دلوقتي
          </h2>
          <p className="text-sm text-fog">
            فريق الدعم متاح يومياً من 10 صباحاً لـ 12 منتصف الليل — وبنرد بسرعة.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/201000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon"
            >
              <WhatsAppIcon size={18} />
              كلمنا واتساب
            </a>
            <Link href="/track" className="btn-ghost">
              <TruckIcon size={18} />
              تتبع طلبك
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
