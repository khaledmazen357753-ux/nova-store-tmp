"use client";

import { useState } from "react";
import type { Product } from "../lib/products";
import { useCart } from "./CartProvider";

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? "");
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, selectedSize);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      {product.sizes && <div className="size-picker"><strong>المقاس</strong><div>{product.sizes.map((size) => <button type="button" key={size} className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></div>}
      <button type="button" className="button button-primary" style={{ width: "100%" }} onClick={handleAdd}>{added ? "تمت إضافة المنتج ✓" : "أضف للسلة"}</button>
    </>
  );
}
