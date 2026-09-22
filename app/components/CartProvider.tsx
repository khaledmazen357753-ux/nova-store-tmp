"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "../lib/products";

type CartItem = Product & { quantity: number; selectedSize?: string };

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: Product, selectedSize?: string) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedCart = window.localStorage.getItem("nova-cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch {
        window.localStorage.removeItem("nova-cart");
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem("nova-cart", JSON.stringify(items));
  }, [items, isHydrated]);

  const value = useMemo(() => ({
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (product: Product, selectedSize?: string) => {
      setItems((current) => {
        const existing = current.find(
          (item) => item.id === product.id && item.selectedSize === selectedSize,
        );
        if (existing) {
          return current.map((item) =>
            item.id === product.id && item.selectedSize === selectedSize
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [...current, { ...product, selectedSize, quantity: 1 }];
      });
    },
    removeItem: (id: number) => {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    updateQuantity: (id: number, quantity: number) => {
      setItems((current) =>
        quantity < 1
          ? current.filter((item) => item.id !== id)
          : current.map((item) => (item.id === id ? { ...item, quantity } : item)),
      );
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
