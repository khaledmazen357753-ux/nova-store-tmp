"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getProduct } from "./products";

export const FREE_SHIPPING_THRESHOLD = 1000;
export const SHIPPING_FEE = 60;

export type CartLine = { id: number; qty: number };

export type Order = {
  no: string;
  date: number;
  items: CartLine[];
  total: number;
  status: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  pay: "cod" | "online";
};

type CouponDef = { type: "percent" | "ship"; value: number; label: string };

export const COUPONS: Record<string, CouponDef> = {
  VOLT5: { type: "percent", value: 5, label: "خصم 5%" },
  VOLT10: { type: "percent", value: 10, label: "خصم 10%" },
  VOLT15: { type: "percent", value: 15, label: "خصم 15%" },
  VOLT20: { type: "percent", value: 20, label: "خصم 20%" },
  FREESHIP: { type: "ship", value: 0, label: "شحن مجاني" },
};

type Store = {
  ready: boolean;
  cart: CartLine[];
  addToCart: (id: number, qty?: number) => void;
  addManyToCart: (ids: number[]) => void;
  setQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
  device: string | null;
  setDevice: (d: string | null) => void;
  coupon: string | null;
  applyCoupon: (code: string) => { ok: boolean; msg: string };
  removeCoupon: () => void;
  discount: number;
  shipping: number;
  total: number;
  orders: Order[];
  placeOrder: (info: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pay: "cod" | "online";
  }) => string;
};

const Ctx = createContext<Store | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

const DEMO_ORDER: Order = {
  no: "VLT-1024",
  date: Date.now() - 2 * 24 * 3600 * 1000,
  items: [{ id: 9, qty: 1 }],
  total: 799,
  status: 3,
  name: "أحمد",
  phone: "01000000000",
  address: "مدينة نصر",
  city: "القاهرة",
  pay: "cod",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [device, setDeviceState] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(read("volt_cart", []));
    setDeviceState(read("volt_device", null));
    setCoupon(read("volt_coupon", null));
    let os = read<Order[]>("volt_orders", []);
    if (!localStorage.getItem("volt_orders")) {
      os = [DEMO_ORDER];
      localStorage.setItem("volt_orders", JSON.stringify(os));
    }
    setOrders(os);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("volt_cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("volt_device", JSON.stringify(device));
  }, [device, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("volt_coupon", JSON.stringify(coupon));
  }, [coupon, ready]);

  const setDevice = (d: string | null) => setDeviceState(d);

  const addToCart = (id: number, qty = 1) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.id === id);
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], qty: Math.min(9, n[i].qty + qty) };
        return n;
      }
      return [...c, { id, qty }];
    });

  const addManyToCart = (ids: number[]) =>
    setCart((c) => {
      const n = [...c];
      ids.forEach((id) => {
        const i = n.findIndex((l) => l.id === id);
        if (i >= 0) n[i] = { ...n[i], qty: Math.min(9, n[i].qty + 1) };
        else n.push({ id, qty: 1 });
      });
      return n;
    });

  const setQty = (id: number, qty: number) =>
    setCart((c) =>
      qty <= 0
        ? c.filter((l) => l.id !== id)
        : c.map((l) => (l.id === id ? { ...l, qty: Math.min(9, qty) } : l))
    );

  const removeFromCart = (id: number) => setCart((c) => c.filter((l) => l.id !== id));
  const clearCart = () => setCart([]);

  const count = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + (getProduct(l.id)?.price ?? 0) * l.qty, 0);

  const couponDef = coupon ? COUPONS[coupon] : undefined;
  const discount = couponDef?.type === "percent" ? Math.round((subtotal * couponDef.value) / 100) : 0;
  const freeShip = subtotal >= FREE_SHIPPING_THRESHOLD || couponDef?.type === "ship";
  const shipping = subtotal === 0 || freeShip ? 0 : SHIPPING_FEE;
  const total = subtotal - discount + shipping;

  const applyCoupon = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return { ok: false, msg: "اكتب الكود الأول" };
    if (!COUPONS[c]) return { ok: false, msg: "الكود ده مش موجود — جرب كود من عجلة الحظ" };
    setCoupon(c);
    return { ok: true, msg: `تم تفعيل ${COUPONS[c].label} — هيخصم تلقائي في السلة` };
  };
  const removeCoupon = () => setCoupon(null);

  const placeOrder: Store["placeOrder"] = (info) => {
    const no = `VLT-${Math.floor(1000 + Math.random() * 9000)}`;
    const order: Order = { ...info, no, date: Date.now(), items: cart, total, status: 1 };
    setOrders((o) => {
      const n = [...o, order];
      localStorage.setItem("volt_orders", JSON.stringify(n));
      return n;
    });
    setCart([]);
    return no;
  };

  const value = useMemo<Store>(
    () => ({
      ready,
      cart,
      addToCart,
      addManyToCart,
      setQty,
      removeFromCart,
      clearCart,
      count,
      subtotal,
      device,
      setDevice,
      coupon,
      applyCoupon,
      removeCoupon,
      discount,
      shipping,
      total,
      orders,
      placeOrder,
    }),
    [ready, cart, device, coupon, orders, subtotal, discount, shipping, total]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
