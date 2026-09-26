"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "../lib/products";
import { isCompatible } from "../lib/products";
import { useStore } from "../lib/store";
import { BagIcon, CheckCircleIcon, ShieldCheckIcon } from "./icons";

function MinusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** صندوق الشراء — تفاعلي مع محدد الجهاز + كمية + طلب فوري */
export default function BuyBox({ product }: { product: Product }) {
  const { addToCart, device } = useStore();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const compatOk = isCompatible(product, device);
  const universal = product.compat === "all";

  const buyNow = () => {
    addToCart(product.id, qty);
    router.push("/checkout");
  };

  const add = () => {
    addToCart(product.id, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="mt-6">
      {/* فحص التوافق مع جهاز العميل */}
      {device && compatOk && (
        <span className="chip border-mint/30 bg-mint/10 text-mint">
          <CheckCircleIcon size={15} />
          متوافق مع جهازك ({device})
        </span>
      )}
      {device && !compatOk && (
        <span className="chip border-danger/40 bg-danger/10 text-danger">
          <ShieldCheckIcon size={15} />
          البند ده مش متوافق مع {device}
        </span>
      )}
      {!device && (
        <Link href="/#device-finder" className="chip transition-colors hover:border-neon/40 hover:text-neon">
          <ShieldCheckIcon size={15} className="text-neon" />
          {universal ? "متوافق مع كل الأجهزة — أو اختار موبايلك للتأكد" : "اختار موبايلك للتأكد من التوافق"}
        </Link>
      )}

      {/* الكمية */}
      <div className="mt-5 flex items-center gap-4">
        <span className="text-sm font-bold text-snow">الكمية</span>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-panel-2 p-1">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-10 w-10 place-items-center rounded-lg text-snow transition-colors hover:bg-panel hover:text-neon"
            aria-label="قلل الكمية"
          >
            <MinusIcon size={18} />
          </button>
          <span className="w-10 text-center font-display text-lg font-black" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(9, q + 1))}
            className="grid h-10 w-10 place-items-center rounded-lg text-snow transition-colors hover:bg-panel hover:text-neon"
            aria-label="زود الكمية"
          >
            <PlusIcon size={18} />
          </button>
        </div>
      </div>

      {/* الأزرار */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={buyNow} className="btn-neon animate-pulse-glow font-display text-lg">
          اطلب الآن، وعيش التجربة
        </button>
        <button onClick={add} className="btn-ghost">
          {added ? (
            <>
              <CheckCircleIcon size={18} className="text-mint" />
              تمت الإضافة
            </>
          ) : (
            <>
              <BagIcon size={18} />
              أضف للسلة
            </>
          )}
        </button>
      </div>
    </div>
  );
}
