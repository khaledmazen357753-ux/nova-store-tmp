import Link from "next/link";
import {
  BoltIcon,
  CashIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "./icons";
import { categories } from "../lib/products";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon text-ink">
                <BoltIcon size={20} />
              </span>
              <span className="font-display text-xl font-black text-snow">VOLT</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-fog">
              متجر إكسسوارات الموبايل للشباب — الجيمنج والفايب والأناقة. جودة مضروبة في الترند،
              وأسعار على قدها. دفع عند الاستلام واستبدال فوري خلال 14 يوم.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href="https://wa.me/201000000000"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
                className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel-2 text-fog transition-colors hover:border-neon/50 hover:text-neon"
              >
                <WhatsAppIcon size={19} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="إنستغرام"
                className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel-2 text-fog transition-colors hover:border-neon/50 hover:text-neon"
              >
                <InstagramIcon size={19} />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تيك توك"
                className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-panel-2 text-fog transition-colors hover:border-neon/50 hover:text-neon"
              >
                <TikTokIcon size={19} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display font-black text-snow">تسوّق</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-fog">
              {categories.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/products?category=${c.key}`}
                    className="transition-colors hover:text-neon"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-black text-snow">الثقة والدعم</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-fog">
              <li>
                <Link href="/track" className="transition-colors hover:text-neon">
                  تتبع طلبك
                </Link>
              </li>
              <li>
                <Link href="/returns" className="transition-colors hover:text-neon">
                  الاستبدال والاسترجاع — 14 يوم
                </Link>
              </li>
              <li>
                <Link href="/products?tag=trending" className="transition-colors hover:text-neon">
                  منتجات الترند
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/201000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-neon"
                >
                  كلمنا واتساب
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-black text-snow">تواصل</h3>
            <ul className="mt-4 space-y-3 text-sm text-fog">
              <li className="flex items-center gap-2.5">
                <WhatsAppIcon size={17} className="shrink-0 text-neon" />
                <span dir="ltr">0100 000 0000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon size={17} className="shrink-0 text-neon" />
                hello@voltstore.eg
              </li>
              <li className="flex items-center gap-2.5">
                <MapPinIcon size={17} className="shrink-0 text-neon" />
                القاهرة، مصر — شحن لكل المحافظات
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-fog sm:flex-row">
          <p>© 2026 VOLT — جميع الحقوق محفوظة.</p>
          <p className="flex items-center gap-2">
            <CashIcon size={14} className="text-neon" />
            الدفع عند الاستلام متاح لجميع محافظات مصر
          </p>
        </div>
      </div>
    </footer>
  );
}
