"use client";

import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { BoltIcon, CheckCircleIcon, GiftIcon, SparklesIcon, XIcon } from "./icons";

/** عجلة الحظ — تظهر مرة واحدة للزائر الجديد، خصم مقابل تسجيل رقم/إيميل */
const SEGMENTS = [
  { label: "خصم 5%", code: "VOLT5", color: "#d4ff3f", text: "#0a0a10" },
  { label: "خصم 10%", code: "VOLT10", color: "#1a1a29", text: "#f4f4f8" },
  { label: "خصم 20%", code: "VOLT20", color: "#8b5cf6", text: "#f4f4f8" },
  { label: "حظ أوفر", code: null, color: "#1a1a29", text: "#a0a3b1" },
  { label: "خصم 15%", code: "VOLT15", color: "#d4ff3f", text: "#0a0a10" },
  { label: "شحن مجاني", code: "FREESHIP", color: "#1a1a29", text: "#3dff88" },
];

export default function SpinWheel() {
  const { applyCoupon } = useStore();
  const [open, setOpen] = useState(false);
  const [rot, setRot] = useState(0);
  const [phase, setPhase] = useState<"idle" | "spin" | "result">("idle");
  const [prize, setPrize] = useState<number | null>(null);
  const [contact, setContact] = useState("");
  const [contactErr, setContactErr] = useState("");
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("volt_wheel_done")) return;
    const t = window.setTimeout(() => setOpen(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  const finish = () => {
    localStorage.setItem("volt_wheel_done", "1");
    setOpen(false);
  };

  const spin = () => {
    if (phase === "spin") return;
    const idx = Math.floor(Math.random() * SEGMENTS.length);
    const jitter = Math.floor(Math.random() * 36) - 18;
    const landing = 360 * 5 - (idx * 60 + 30) + jitter;
    setRot((r) => r + landing);
    setPhase("spin");
    window.setTimeout(() => {
      setPrize(idx);
      setPhase("result");
    }, 4400);
  };

  const activate = () => {
    const v = contact.trim();
    if (v.length < 8 || (!v.includes("@") && !/^0\d{10}$/.test(v.replace(/\s/g, "")))) {
      setContactErr("اكتب رقم موبايل صحيح أو إيميل");
      return;
    }
    setContactErr("");
    const seg = prize !== null ? SEGMENTS[prize] : null;
    if (seg?.code) applyCoupon(seg.code);
    setActivated(true);
  };

  if (!open) return null;

  const conic = `conic-gradient(${SEGMENTS.map(
    (s, i) => `${s.color} ${i * 60}deg ${(i + 1) * 60}deg`
  ).join(",")})`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="عجلة الحظ — اكسب خصم"
    >
      <div className="relative w-full rounded-t-3xl border border-line bg-panel p-6 pb-8 sm:max-w-md sm:rounded-3xl sm:p-8">
        <button
          onClick={finish}
          aria-label="اقفل النافذة"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl border border-line bg-panel-2 text-fog transition-colors hover:border-danger/50 hover:text-danger"
        >
          <XIcon size={18} />
        </button>

        {phase !== "result" ? (
          <>
            <div className="flex items-center justify-center gap-2 text-neon">
              <GiftIcon size={22} />
              <span className="chip border-neon/30 bg-neon/10 text-neon">لف واكسب في ثواني</span>
            </div>
            <h2 className="mt-3 text-center font-display text-2xl font-black text-snow">
              عجلة الحظ بتاعتك — خصم لحد 20%
            </h2>
            <p className="mt-2 text-center text-sm text-fog">
              لف العجلة، سجّل رقمك أو إيميلك، وفعّل كودك فوراً.
            </p>

            <div className="relative mx-auto mt-6 h-[250px] w-[250px]">
              {/* المؤشر */}
              <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 border-x-[9px] border-x-transparent border-b-[16px] border-b-neon drop-shadow-[0_0_8px_rgba(212,255,63,.7)]" />
              <div className="absolute inset-0 rounded-full border-4 border-line bg-panel-2" />
              <div
                className="absolute inset-2 rounded-full"
                style={{
                  background: conic,
                  transform: `rotate(${rot}deg)`,
                  transition: "transform 4.3s cubic-bezier(.15,.85,.22,1)",
                }}
                aria-hidden="true"
              >
                {SEGMENTS.map((s, i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 w-max text-[11px] font-black"
                    style={{
                      transform: `translate(-50%,-50%) rotate(${i * 60 + 30}deg) translateY(-102px)`,
                      color: s.text,
                    }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
              <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-line bg-panel text-neon">
                <BoltIcon size={24} />
              </div>
            </div>

            <button
              onClick={spin}
              disabled={phase === "spin"}
              className="btn-neon animate-pulse-glow mt-6 w-full font-display text-lg"
            >
              {phase === "spin" ? "بتلف..." : "لف العجلة الآن"}
            </button>
            <button
              onClick={finish}
              className="mx-auto mt-3 block text-xs text-fog underline-offset-4 transition-colors hover:text-snow hover:underline"
            >
              لا شكراً، هدخل بأسعاري
            </button>
          </>
        ) : (
          <div className="text-center">
            {activated ? (
              <>
                <CheckCircleIcon size={64} className="mx-auto text-mint" />
                <h2 className="mt-4 font-display text-2xl font-black text-snow">كودك جاهز</h2>
                {SEGMENTS[prize ?? 0].code ? (
                  <>
                    <p className="mt-2 text-sm text-fog">
                      كود الخصم اتفعّل تلقائياً وهييتخصم في السلة
                    </p>
                    <div className="mx-auto mt-4 w-max rounded-2xl border-2 border-dashed border-neon bg-neon/10 px-6 py-3">
                      <span className="font-display text-2xl font-black tracking-widest text-neon" dir="ltr">
                        {SEGMENTS[prize ?? 0].code}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-fog">
                    حظ أوفر المرة دي — بس متشيلش عينك عن العروض، في مفاجآت جاية.
                  </p>
                )}
                <button onClick={finish} className="btn-neon mt-6 w-full">
                  يلا نتسوّق
                </button>
              </>
            ) : (
              <>
                <SparklesIcon size={48} className="mx-auto text-neon" />
                <h2 className="mt-4 font-display text-2xl font-black text-snow">
                  {SEGMENTS[prize ?? 0].code ? "كسبت " + SEGMENTS[prize ?? 0].label + "!" : "حظ أوفر!"}
                </h2>
                {SEGMENTS[prize ?? 0].code ? (
                  <>
                    <p className="mt-2 text-sm text-fog">
                      سجّل رقم موبايلك أو إيميلك لتفعيل الكود — وهنبعتلك عروض حصرية كمان.
                    </p>
                    <input
                      type="text"
                      inputMode="email"
                      dir="ltr"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="01xxxxxxxxx أو email@example.com"
                      className="input mt-4 text-left"
                      aria-label="رقم الموبايل أو البريد الإلكتروني"
                    />
                    {contactErr && (
                      <p className="mt-1.5 text-right text-xs text-danger" role="alert">
                        {contactErr}
                      </p>
                    )}
                    <button onClick={activate} className="btn-neon mt-4 w-full">
                      فعّل الكود
                    </button>
                  </>
                ) : (
                  <button onClick={finish} className="btn-neon mt-6 w-full">
                    يلا نتسوّق براحتك
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
