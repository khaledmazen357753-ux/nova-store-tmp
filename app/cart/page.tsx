"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FREE_SHIPPING_THRESHOLD, useStore } from "../lib/store";
import { getProduct } from "../lib/products";
import ProductCard from "../components/ProductCard";
import {
  ArrowLeftIcon,
  BagIcon,
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
  TagIcon,
  TruckIcon,
  XIcon,
} from "../components/icons";
import { products } from "../lib/products";

function ShippingBar({ subtotal }: { subtotal: number }) {
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <TruckIcon size={18} className={remaining <= 0 ? "text-mint" : "text-neon"} />
        {remaining > 0 ? (
          <span className="text-snow">
            أضف منتجات بقيمة <b className="text-neon">EGP {remaining}</b> إضافية لتستمتع بالشحن
            المجاني!
          </span>
        ) : (
          <span className="text-mint">مبروك! الشحن مجاني على طلبك</span>
        )}
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-panel-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="التقدم نحو الشحن المجاني"
      >
        <div
          className="h-full rounded-full bg-gradient-to-l from-neon to-mint transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  const {
    ready,
    cart,
    setQty,
    removeFromCart,
    subtotal,
    discount,
    shipping,
    total,
    coupon,
    applyCoupon,
    removeCoupon,
  } = useStore();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-fog">جاري التحميل...</div>
    );
  }

  if (cart.length === 0) {
    const suggestions = products.filter((p) => p.trending).slice(0, 4);
    return (
      <div className="container-x py-12">
        <div className="card mx-auto flex max-w-lg flex-col items-center p-12 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-panel-2 text-fog">
            <BagIcon size={40} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-black text-snow">سلّتك فاضية..</h1>
          <p className="mt-2 text-fog">الدنيا بتستاهل — اتسوّق النهاردة واقتنص نسختك</p>
          <Link href="/products" className="btn-neon mt-6">
            يلا نتسوّق
            <ArrowLeftIcon size={17} />
          </Link>
        </div>

        <h2 className="section-title mt-14 text-center">الترند دلوقتي — ابدأ من هنا</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {suggestions.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-2xl font-black text-snow sm:text-3xl">سلّتك</h1>
      <p className="mt-1 text-sm text-fog">
        عندك {cart.length} {cart.length === 1 ? "بند" : "بنود"} جاهزين
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* المنتجات */}
        <div className="space-y-4">
          <ShippingBar subtotal={subtotal} />

          {cart.map((line) => {
            const p = getProduct(line.id);
            if (!p) return null;
            return (
              <div key={line.id} className="card flex gap-4 p-4">
                <Link
                  href={`/product/${p.id}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-panel-2"
                >
                  {p.img ? (
                    <Image src={p.img} alt={p.name} fill sizes="96px" className="object-cover" />
                  ) : (
                    <span className="bg-dots grid h-full w-full place-items-center text-fog">
                      <TagIcon size={26} />
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${p.id}`}
                      className="font-display text-sm font-bold leading-snug text-snow transition-colors hover:text-neon sm:text-base"
                    >
                      {p.name}
                    </Link>
                    <button
                      onClick={() => removeFromCart(p.id)}
                      aria-label={`شيل ${p.name} من السلة`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fog transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                  <span className="mt-1 text-sm font-black text-neon">EGP {p.price}</span>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-1 rounded-xl border border-line bg-panel-2 p-1">
                      <button
                        onClick={() => setQty(p.id, line.qty - 1)}
                        aria-label={`قلل كمية ${p.name}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-snow transition-colors hover:bg-panel hover:text-neon"
                      >
                        <MinusIcon size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{line.qty}</span>
                      <button
                        onClick={() => setQty(p.id, line.qty + 1)}
                        aria-label={`زود كمية ${p.name}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-snow transition-colors hover:bg-panel hover:text-neon"
                      >
                        <PlusIcon size={16} />
                      </button>
                    </div>
                    <span className="text-sm text-fog">
                      الإجمالي: <b className="text-snow">EGP {p.price * line.qty}</b>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* الملخص */}
        <div className="card h-max p-5 lg:sticky lg:top-32">
          <h2 className="font-display text-lg font-black text-snow">ملخص الطلب</h2>

          {/* الكوبون */}
          {coupon ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-bold text-mint">
                <CheckCircleIcon size={16} />
                كود {coupon} مفعّل
              </span>
              <button
                onClick={() => removeCoupon()}
                className="text-xs font-bold text-fog hover:text-danger"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="كود الخصم (من عجلة الحظ)"
                  className="input min-h-11"
                  aria-label="كود الخصم"
                />
                <button
                  onClick={() => setMsg(applyCoupon(code))}
                  className="btn-dark shrink-0"
                >
                  تفعيل
                </button>
              </div>
              {msg && (
                <p
                  className={`mt-2 text-xs ${msg.ok ? "text-mint" : "text-danger"}`}
                  role="status"
                >
                  {msg.msg}
                </p>
              )}
            </div>
          )}

          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
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

          <Link href="/checkout" className="btn-neon mt-5 w-full font-display text-lg">
            أكمل الطلب — تشيك آوت بسرعة
            <ArrowLeftIcon size={17} />
          </Link>
          <p className="mt-3 text-center text-xs text-fog">دفع عند الاستلام متاح — استبدال خلال 14 يوم</p>
        </div>
      </div>
    </div>
  );
}
