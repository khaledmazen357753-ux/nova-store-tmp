"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "../lib/products";
import { getProduct } from "../lib/products";
import { useStore } from "../lib/store";
import { BoltIcon, CheckCircleIcon, SparklesIcon } from "./icons";

/** أكمل الإكسسوار (Complete the Look) — Cross-selling تحت المنتج */
export default function LookBundle({ product }: { product: Product }) {
  const { addManyToCart } = useStore();
  const ids = product.lookWith ?? [];
  const items = ids.map(getProduct).filter((p): p is Product => Boolean(p));
  const [picked, setPicked] = useState<number[]>(ids);
  const [added, setAdded] = useState(false);
  if (!items.length) return null;

  const toggle = (id: number) =>
    setPicked((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const total = items.filter((p) => picked.includes(p.id)).reduce((s, p) => s + p.price, 0);

  const add = () => {
    if (!picked.length) return;
    addManyToCart([product.id, ...picked]);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <section className="mt-14">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet/15 text-violet">
          <SparklesIcon size={22} />
        </span>
        <div>
          <h2 className="font-display text-xl font-black text-snow sm:text-2xl">أكمل الإكسسوار</h2>
          <p className="text-sm text-fog">اللي زبايننا بياخدوه مع البند ده — كومبو كامل بضغطة زر</p>
        </div>
      </div>

      <div className="card mt-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => {
            const on = picked.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all ${
                  on ? "border-neon/40 bg-neon/5" : "border-line bg-panel-2 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(p.id)}
                  className="h-5 w-5 accent-[#d4ff3f]"
                  aria-label={`ضم ${p.name} للكومبو`}
                />
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                  {p.img && <Image src={p.img} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-snow">{p.name}</span>
                  <span className="text-sm font-black text-neon">EGP {p.price}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="leading-none">
            <span className="text-xs text-fog">إجمالي الكومبو (مع البند الحالي)</span>
            <div className="mt-1 font-display text-xl font-black text-snow">
              EGP {product.price + total}
            </div>
          </div>
          <button
            onClick={add}
            disabled={!picked.length || added}
            className={`inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 py-3 font-bold transition-all ${
              added ? "bg-mint text-ink" : "bg-neon text-ink hover:brightness-110"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {added ? <CheckCircleIcon size={18} /> : <BoltIcon size={18} />}
            {added ? "تمت إضافة الكومبو" : "أضف الكومبو كامل"}
          </button>
        </div>
      </div>
    </section>
  );
}
