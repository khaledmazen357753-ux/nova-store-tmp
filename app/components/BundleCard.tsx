"use client";

import Image from "next/image";
import { useState } from "react";
import { bundles, getProduct } from "../lib/products";
import type { Product } from "../lib/products";
import { useStore } from "../lib/store";
import { BoltIcon, CheckIcon, GamepadIcon, HeadphonesIcon, ShieldCheckIcon, StandIcon } from "./icons";

const CAT_ICON: Record<Product["category"], typeof BoltIcon> = {
  protection: ShieldCheckIcon,
  power: BoltIcon,
  gaming: GamepadIcon,
  audio: HeadphonesIcon,
  mounts: StandIcon,
};

/** كارت البكدجات (Bundles & Kits) — عروض توفير ذكية */
export default function BundleCard({ bundle }: { bundle: (typeof bundles)[number] }) {
  const { addManyToCart } = useStore();
  const [added, setAdded] = useState(false);
  const items = bundle.items.map(getProduct).filter((p): p is Product => Boolean(p));
  const old = items.reduce((s, p) => s + p.price, 0);
  const save = old - bundle.price;

  const add = () => {
    addManyToCart(bundle.items);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="card relative flex flex-col p-5 pt-7 transition-all duration-300 hover:-translate-y-1 hover:border-violet/50">
      <span className="absolute -top-3 right-4 rounded-lg bg-violet px-3 py-1 text-xs font-black text-white shadow-[0_0_20px_rgba(139,92,246,.4)]">
        وفّر EGP {save}
      </span>
      <h3 className="font-display text-lg font-black text-snow">{bundle.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-fog">{bundle.desc}</p>

      <div className="mt-4 flex items-center" aria-hidden="true">
        {items.map((p, i) => {
          const Icon = CAT_ICON[p.category];
          return (
            <div
              key={p.id}
              className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-panel bg-panel-2"
              style={i ? { marginInlineStart: -14, zIndex: items.length - i } : undefined}
            >
              {p.img ? (
                <Image src={p.img} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-fog">
                  <Icon size={26} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-fog">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <CheckIcon size={15} className="shrink-0 text-neon" />
            {p.name}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 mt-6">
        <div className="leading-none">
          <span className="font-display text-xl font-black text-neon">EGP {bundle.price}</span>
          <span className="mr-2 text-xs text-fog line-through">{old}</span>
        </div>
        <button
          onClick={add}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            added ? "bg-mint text-ink" : "bg-neon text-ink hover:brightness-110"
          }`}
        >
          {added ? <CheckIcon size={16} /> : <BoltIcon size={16} />}
          {added ? "تمت الإضافة" : "اقتنص البكج"}
        </button>
      </div>
    </div>
  );
}
