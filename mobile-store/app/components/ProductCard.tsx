"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "../lib/products";
import { useStore } from "../lib/store";
import {
  BagIcon,
  CheckIcon,
  FireIcon,
  GamepadIcon,
  HeadphonesIcon,
  ShieldCheckIcon,
  StandIcon,
  StarIcon,
  BoltIcon,
} from "./icons";

const CAT_ICON: Record<Product["category"], typeof BoltIcon> = {
  protection: ShieldCheckIcon,
  power: BoltIcon,
  gaming: GamepadIcon,
  audio: HeadphonesIcon,
  mounts: StandIcon,
};

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const CatIcon = CAT_ICON[product.category];
  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const add = () => {
    addToCart(product.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="card group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-neon/40 hover:shadow-[0_8px_40px_rgba(212,255,63,0.08)]">
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-panel-2"
        aria-label={product.name}
      >
        {product.img ? (
          <Image
            src={product.img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="bg-dots absolute inset-0 grid place-items-center text-fog">
            <CatIcon size={56} />
          </span>
        )}
        {off > 0 && (
          <span className="absolute right-2 top-2 rounded-lg bg-danger px-2 py-1 text-[11px] font-black text-white">
            خصم {off}%
          </span>
        )}
        {product.trending && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-ink/85 px-2 py-1 text-[11px] font-black text-neon backdrop-blur">
            <FireIcon size={12} />
            ترند
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-sm font-bold leading-snug text-snow transition-colors group-hover:text-neon sm:text-base">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-fog">{product.desc}</p>

        <div className="mt-1.5 flex items-center gap-1" aria-label={`التقييم ${product.rating} من 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon
              key={i}
              size={13}
              className={i < Math.round(product.rating) ? "text-neon" : "text-line"}
            />
          ))}
          <span className="text-[11px] text-fog">({product.reviews.toLocaleString("en")})</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="leading-none">
            <span className="font-display text-base font-black text-neon sm:text-lg">
              EGP {product.price}
            </span>
            {product.oldPrice && (
              <span className="mr-1.5 text-[11px] text-fog line-through">{product.oldPrice}</span>
            )}
          </div>
          <button
            onClick={add}
            className={`grid h-11 w-11 place-items-center rounded-xl transition-all ${
              added
                ? "bg-mint text-ink"
                : "bg-neon text-ink hover:brightness-110 active:scale-95"
            }`}
            aria-label={
              added ? `تمت إضافة ${product.name} للسلة` : `أضف ${product.name} إلى السلة`
            }
          >
            {added ? <CheckIcon size={18} /> : <BagIcon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
