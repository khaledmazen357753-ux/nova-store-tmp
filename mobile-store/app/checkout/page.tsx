"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "../lib/store";
import { getProduct } from "../lib/products";
import {
  ArrowLeftIcon,
  BagIcon,
  CashIcon,
  CheckCircleIcon,
  LockIcon,
  TruckIcon,
} from "../components/icons";

const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الدقهلية",
  "الشرقية",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "الفيوم",
  "بني سويف",
  "أسوان",
  "بورسعيد",
  "السويس",
];

type Errors = { name?: string; phone?: string; city?: string; address?: string };

/** Express Checkout — صفحة واحدة، أقل بيانات ممكنة، COD أو دفع إلكتروني */
export default function CheckoutPage() {
  const { ready, cart, subtotal, discount, shipping, total, placeOrder } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [pay, setPay] = useState<"cod" | "online">("cod");
  const [errors, setErrors] = useState<Errors>({});
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-fog">جاري التحميل...</div>
    );
  }

  /* شاشة النجاح */
  if (orderNo) {
    return (
      <div className="container-x py-14">
        <div className="card mx-auto flex max-w-lg flex-col items-center p-10 text-center">
          <CheckCircleIcon size={72} className="text-mint" />
          <h1 className="mt-5 font-display text-3xl font-black text-snow">تم تأكيد طلبك!</h1>
          <p className="mt-3 leading-relaxed text-fog">
            طلبك رقم{" "}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(orderNo);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg bg-neon/10 px-2 py-1 font-black text-neon transition-colors hover:bg-neon/20"
              aria-label={`انسخ رقم الطلب ${orderNo}`}
            >
              {orderNo}
            </button>{" "}
            — هيوصلك خلال 24-48 ساعة، وهنتواصل معاك على <span dir="ltr">{phone}</span> للتأكيد.
          </p>
          <p className="mt-2 text-sm text-fog">
            {pay === "cod" ? "هتدفع EGP " + total + " كاش عند الاستلام" : "تم تسجيل طلبك للدفع الإلكتروني عند التأكيد"}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/track" className="btn-neon">
              <TruckIcon size={18} />
              تتبع طلبك
            </Link>
            <Link href="/products" className="btn-ghost">
              واصل التسوّق
            </Link>
          </div>
          {copied && <p className="mt-3 text-xs text-mint">تم نسخ رقم الطلب</p>}
        </div>
      </div>
    );
  }

  /* سلة فاضية */
  if (cart.length === 0) {
    return (
      <div className="container-x py-14">
        <div className="card mx-auto flex max-w-md flex-col items-center p-10 text-center">
          <BagIcon size={52} className="text-fog" />
          <h1 className="mt-4 font-display text-2xl font-black text-snow">مفيش حاجة نطلبها لسه</h1>
          <p className="mt-2 text-fog">اختار منتجاتك الأول وبعدين تعالى هنا — هياخدوا منك دقيقة</p>
          <Link href="/products" className="btn-neon mt-6">
            يلا نتسوّق
            <ArrowLeftIcon size={17} />
          </Link>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const e: Errors = {};
    if (name.trim().length < 3) e.name = "اكتب اسمك بالكامل";
    if (!/^01[0125][0-9]{8}$/.test(phone.replace(/\s/g, ""))) e.phone = "رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)";
    if (!city) e.city = "اختار المحافظة";
    if (address.trim().length < 8) e.address = "اكتب العنوان بالتفصيل (شارع ومبنى وعلامة مميزة)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const no = placeOrder({ name: name.trim(), phone: phone.trim(), address: address.trim(), city, pay });
    setOrderNo(no);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-black text-snow sm:text-3xl">إتمام الطلب</h1>
        <span className="chip border-neon/30 bg-neon/10 text-neon">
          <LockIcon size={14} />
          صفحة واحدة — دقيقة وخلصنا
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* البيانات */}
        <div className="space-y-5">
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black text-snow">بياناتك</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="label">
                  الاسم
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك بالكامل"
                  className="input"
                  autoComplete="name"
                />
                {errors.name && <p className="mt-1.5 text-xs text-danger" role="alert">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="label">
                  رقم الموبايل
                </label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  inputMode="tel"
                  dir="ltr"
                  className="input text-left"
                  autoComplete="tel"
                />
                {errors.phone && <p className="mt-1.5 text-xs text-danger" role="alert">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="city" className="label">
                  المحافظة
                </label>
                <select
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input"
                >
                  <option value="">اختار المحافظة...</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="mt-1.5 text-xs text-danger" role="alert">{errors.city}</p>}
              </div>
              <div>
                <label htmlFor="address" className="label">
                  العنوان
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="شارع، مبنى، علامة مميزة"
                  className="input"
                  autoComplete="street-address"
                />
                {errors.address && <p className="mt-1.5 text-xs text-danger" role="alert">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* طريقة الدفع */}
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black text-snow">طريقة الدفع</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                  pay === "cod" ? "border-neon bg-neon/5" : "border-line bg-panel-2"
                }`}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={pay === "cod"}
                  onChange={() => setPay("cod")}
                  className="h-5 w-5 accent-[#d4ff3f]"
                />
                <CashIcon size={24} className={pay === "cod" ? "text-neon" : "text-fog"} />
                <span>
                  <span className="block font-bold text-snow">الدفع عند الاستلام</span>
                  <span className="text-xs text-fog">ادفع كاش وأنت مستلم طلبك</span>
                </span>
              </label>
              <label
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                  pay === "online" ? "border-neon bg-neon/5" : "border-line bg-panel-2"
                }`}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={pay === "online"}
                  onChange={() => setPay("online")}
                  className="h-5 w-5 accent-[#d4ff3f]"
                />
                <LockIcon size={24} className={pay === "online" ? "text-neon" : "text-fog"} />
                <span>
                  <span className="block font-bold text-snow">دفع إلكتروني</span>
                  <span className="text-xs text-fog">فيزا / ماستركارد / محفظة إلكترونية</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* الملخص */}
        <div className="card h-max p-5 lg:sticky lg:top-32">
          <h2 className="font-display text-lg font-black text-snow">ملخص الطلب</h2>
          <ul className="mt-4 space-y-3 border-t border-line pt-4">
            {cart.map((line) => {
              const p = getProduct(line.id);
              if (!p) return null;
              return (
                <li key={line.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-fog">
                    {p.name} <span className="text-snow">× {line.qty}</span>
                  </span>
                  <span className="shrink-0 font-bold text-snow">EGP {p.price * line.qty}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-fog">
              <dt>المجموع الفرعي</dt>
              <dd className="text-snow">EGP {subtotal}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-fog">
                <dt>الخصم</dt>
                <dd className="text-mint">- EGP {discount}</dd>
              </div>
            )}
            <div className="flex justify-between text-fog">
              <dt>الشحن</dt>
              <dd className={shipping === 0 ? "text-mint" : "text-snow"}>
                {shipping === 0 ? "مجاني" : `EGP ${shipping}`}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 font-display text-lg font-black">
              <dt className="text-snow">الإجمالي</dt>
              <dd className="text-neon">EGP {total}</dd>
            </div>
          </dl>

          <button onClick={submit} className="btn-neon animate-pulse-glow mt-5 w-full font-display text-lg">
            اطلب الآن — تأكيد الطلب
          </button>
          <p className="mt-3 text-center text-xs text-fog">
            بياناتك محفوظة بأمان — ولينا عليك ضمان استبدال 14 يوم
          </p>
        </div>
      </div>
    </div>
  );
}
