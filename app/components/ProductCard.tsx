"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "../lib/products";
import { formatPrice } from "../lib/products";
import { useCart } from "./CartProvider";

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon icon-sm">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className="icon icon-sm">
      <path d="M20.8 8.8c0 5.2-8.8 10.1-8.8 10.1S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8.8 2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [isSaved, setIsSaved] = useState(false);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, product.sizes?.[0]);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="product-card">
      <div className="product-card-media">
        <Link href={`/product/${product.id}`} aria-label={`عرض ${product.name}`}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px" />
        </Link>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          type="button"
          className={`icon-button product-wishlist ${isSaved ? "is-saved" : ""}`}
          onClick={() => setIsSaved((current) => !current)}
          aria-label={isSaved ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          aria-pressed={isSaved}
        >
          <HeartIcon filled={isSaved} />
        </button>
        <button type="button" className="quick-add" onClick={handleAdd}>
          {added ? "تمت الإضافة" : "أضف للسلة"}
          {!added && <PlusIcon />}
        </button>
      </div>
      <div className="product-card-info">
        <div className="product-card-meta">
          <span>{product.brand} · {product.genderLabel}</span>
          <span className="rating" aria-label={`تقييم ${product.rating} من 5`}>★ {product.rating} ({product.reviewCount})</span>
        </div>
        <Link href={`/product/${product.id}`} className="product-name">{product.name}</Link>
        <p className="product-description">{product.description}</p>
        <div className="product-price-row">
          <span className="product-price">{formatPrice(product.price)} <small>ج.م</small></span>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)} ج.م</del>}
        </div>
      </div>
    </article>
  );
}
