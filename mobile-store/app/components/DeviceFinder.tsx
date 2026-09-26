"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deviceBrands } from "../lib/products";
import { useStore } from "../lib/store";
import { BoltIcon, ChevronDownIcon, PhoneIcon, XIcon } from "./icons";

/** محدد طراز الهاتف (Device Finder) — يفلتر المنتجات المتوافقة مع جهاز العميل بس */
export default function DeviceFinder() {
  const router = useRouter();
  const { device, setDevice } = useStore();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  const apply = () => {
    if (!model) return;
    setDevice(model);
    router.push("/products?filter=device");
  };

  return (
    <section id="device-finder" className="scroll-mt-24 py-14">
      <div className="container-x">
        <div className="card relative overflow-hidden p-5 sm:p-8">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 text-neon">
                <PhoneIcon size={22} />
              </span>
              <div>
                <h2 className="font-display text-xl font-black text-snow sm:text-2xl">
                  محدد طراز الهاتف
                </h2>
                <p className="text-sm text-fog">
                  اختار موبايلك — وهنوريك الإكسسوارات المتوافقة معاه بس. صفر حيرة.
                </p>
              </div>
              <span className="chip mr-auto border-neon/30 bg-neon/10 text-neon">
                <BoltIcon size={14} />
                بثواني
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <label htmlFor="brand" className="label">
                  الماركة
                </label>
                <select
                  id="brand"
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setModel("");
                  }}
                  className="input appearance-none pl-4"
                >
                  <option value="">اختار الماركة...</option>
                  {Object.keys(deviceBrands).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={18}
                  className="pointer-events-none absolute bottom-4 left-4 text-fog"
                />
              </div>

              <div className="relative">
                <label htmlFor="model" className="label">
                  الموديل
                </label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!brand}
                  className="input appearance-none pl-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{brand ? "اختار الموديل..." : "اختار الماركة الأول"}</option>
                  {brand &&
                    deviceBrands[brand].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                <ChevronDownIcon
                  size={18}
                  className="pointer-events-none absolute bottom-4 left-4 text-fog"
                />
              </div>

              <div className="flex items-end">
                <button onClick={apply} disabled={!model} className="btn-neon w-full sm:w-auto">
                  شوف المتوافق
                </button>
              </div>
            </div>

            {device && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="chip border-mint/30 bg-mint/10 text-mint">
                  <PhoneIcon size={14} />
                  موبايلك الحالي: {device}
                </span>
                <button
                  onClick={() => setDevice(null)}
                  className="text-xs font-bold text-fog underline-offset-4 transition-colors hover:text-danger hover:underline"
                >
                  امسح وشوف كل المنتجات
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
