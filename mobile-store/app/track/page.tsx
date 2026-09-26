"use client";

import { useState } from "react";
import { useStore } from "../lib/store";
import { getProduct } from "../lib/products";
import { CheckCircleIcon, ClockIcon, SearchIcon, TruckIcon, WhatsAppIcon } from "../components/icons";

const STEPS = ["تم استلام الطلب", "جاري التجهيز", "مع شركة الشحن", "في الطريق إليك", "تم التسليم"];

/** تتبع الطلب — صفحة بسيطة بتقلل مكالمات خدمة العملاء */
export default function TrackPage() {
  const { ready, orders } = useStore();
  const [no, setNo] = useState("");
  const [result, setResult] = useState<{ found: boolean; no?: string } | null>(null);

  const search = () => {
    const v = no.trim().toUpperCase();
    if (!v) return;
    const found = orders.some((o) => o.no === v);
    setResult({ found, no: v });
  };

  const order = result?.no ? orders.find((o) => o.no === result.no) : undefined;

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neon/10 text-neon">
            <TruckIcon size={26} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black text-snow sm:text-3xl">تتبع طلبك</h1>
          <p className="mt-2 text-fog">اكتب رقم الطلب اللي وصلك — واعرف شحنتك فين من غير مكالمات</p>
        </div>

        <div className="card mt-8 p-5 sm:p-6">
          <label htmlFor="orderNo" className="label">
            رقم الطلب
          </label>
          <div className="flex gap-2">
            <input
              id="orderNo"
              value={no}
              onChange={(e) => setNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="مثال: VLT-1024"
              dir="ltr"
              className="input text-left"
            />
            <button onClick={search} className="btn-neon shrink-0">
              <SearchIcon size={18} />
              تتبع
            </button>
          </div>

          {result && !result.found && (
            <div className="mt-5 rounded-2xl border border-line bg-panel-2 p-5 text-center">
              <SearchIcon size={40} className="mx-auto text-fog" />
              <p className="mt-3 font-bold text-snow">ملقيناش طلب بالرقم ده</p>
              <p className="mt-1.5 text-sm text-fog">
                اتأكد من الرقم اللي وصلك بعد التأكيد — أو كلمنا واتساب وهنساعدك فوراً.
              </p>
              <p className="mt-2 text-xs text-fog">
                (للتجربة: جرب الرقم <b className="text-neon">VLT-1024</b>)
              </p>
              <a
                href="https://wa.me/201000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-4"
              >
                <WhatsAppIcon size={17} />
                كلمنا واتساب
              </a>
            </div>
          )}
        </div>

        {result?.found && order && ready && (
          <div className="card mt-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-fog">طلب رقم</span>
                <div className="font-display text-xl font-black text-neon" dir="ltr">
                  {order.no}
                </div>
              </div>
              <span className="chip border-mint/30 bg-mint/10 text-mint">
                <CheckCircleIcon size={14} />
                {STEPS[Math.min(order.status, STEPS.length - 1)]}
              </span>
            </div>

            <ul className="mt-6 space-y-0">
              {STEPS.map((step, i) => {
                const done = i < order.status;
                const current = i === order.status;
                return (
                  <li key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${
                          done
                            ? "border-mint bg-mint/15 text-mint"
                            : current
                              ? "animate-pulse-glow border-neon bg-neon/15 text-neon"
                              : "border-line bg-panel-2 text-fog"
                        }`}
                      >
                        {done ? (
                          <CheckCircleIcon size={20} />
                        ) : current ? (
                          <ClockIcon size={20} />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </span>
                      {i < STEPS.length - 1 && (
                        <span
                          className={`h-8 w-0.5 ${i < order.status ? "bg-mint/50" : "bg-line"}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="pb-8">
                      <div
                        className={`font-bold ${
                          done || current ? "text-snow" : "text-fog"
                        }`}
                      >
                        {step}
                      </div>
                      <div className="text-xs text-fog">
                        {done ? "تم" : current ? "جاري الآن" : "قيد الانتظار"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
              <span className="text-fog">
                {order.items.map((l) => getProduct(l.id)?.name).filter(Boolean).join(" · ")}
              </span>
              <span className="font-black text-snow">EGP {order.total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
