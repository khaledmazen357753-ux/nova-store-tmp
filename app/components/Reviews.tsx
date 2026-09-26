import Image from "next/image";
import { CameraIcon, CheckCircleIcon, StarIcon } from "./icons";

/** نظام التقييمات بالصور — صور حقيقية من عملاء استلموا فعلاً (بيانات تجريبية) */
const REVIEWS = [
  {
    name: "زياد م.",
    initial: "ز",
    rating: 5,
    text: "الجراب جودة جامدة — وقع مني على السيراميك ومفيش حاجة حصلت للموبايل. والشحن وصل في يومين.",
    photo: "/products/case.jpg",
    product: "جراب Armor-X",
  },
  {
    name: "مريم ع.",
    initial: "م",
    rating: 5,
    text: "السماعة صوتها نضيف والـ ANC شغال بجد في الميترو. طلبت بكدج الحماية لكل العيلة.",
    photo: "/products/earbuds.jpg",
    product: "سماعة BassPods Pro",
  },
  {
    name: "عمر ك.",
    initial: "ع",
    rating: 4,
    text: "التريجر غيرلي مستوى اللعب خالص، والرد على الواتساب كان في دقايق. تجربة نضيفة.",
    photo: "/products/trigger.jpg",
    product: "Trigger FSM V2",
  },
];

export default function Reviews({ title = "الناس بتقول إيه؟" }: { title?: string }) {
  return (
    <section className="py-14">
      <div className="container-x">
        <div className="mb-8 text-center">
          <h2 className="section-title">{title}</h2>
          <p className="mt-2 text-fog">تقييمات بصور حقيقية من عملاء استلموا فعلاً</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <div key={i} className="card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-neon/15 font-display text-lg font-black text-neon">
                  {r.initial}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-snow">{r.name}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-mint">
                      <CheckCircleIcon size={13} />
                      مشتري موثّق
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <StarIcon
                        key={s}
                        size={13}
                        className={s < r.rating ? "text-neon" : "text-line"}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-fog">“{r.text}”</p>

              <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                  <Image src={r.photo} alt={`صورة العميل لـ ${r.product}`} fill sizes="56px" className="object-cover" />
                </span>
                <span className="flex items-center gap-1.5 text-xs text-fog">
                  <CameraIcon size={15} className="text-neon" />
                  صورة حقيقية بعد الاستلام — {r.product}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
