"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import { products } from "../lib/products";

type Category = "all" | "shoes" | "pants" | "offers";

function ProductsContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");

  useEffect(() => {
    const category = searchParams.get("category");
    setSelectedCategory(category === "shoes" || category === "pants" || category === "offers" ? category : "all");
  }, [searchParams]);

  const filteredProducts = selectedCategory === "all"
    ? products
    : selectedCategory === "offers"
      ? products.filter((product) => product.oldPrice)
      : products.filter((product) => product.category === selectedCategory);

  const categoryName = selectedCategory === "shoes" ? "الأحذية" : selectedCategory === "pants" ? "البنطلونات" : selectedCategory === "offers" ? "العروض" : "كل المنتجات";

  function setCategory(category: Category) {
    setSelectedCategory(category);
    window.history.replaceState(null, "", category === "all" ? "/products" : `/products?category=${category}`);
  }

  return (
    <main>
      <section className="inner-hero">
        <div className="site-container">
          <span className="eyebrow">Nova Store · المجموعة الكاملة</span>
          <h1>{categoryName}</h1>
          <p>قطع مختارة بعناية — تصميم مريح، جودة واضحة، وسعر عادل.</p>
        </div>
      </section>
      <section className="page-content section-light">
        <div className="site-container">
          <div className="filter-row" aria-label="تصنيفات المنتجات">
            {(["all", "shoes", "pants", "offers"] as Category[]).map((category) => {
              const labels: Record<Category, string> = { all: "الكل", shoes: "أحذية", pants: "بنطلونات", offers: "العروض" };
              return <button type="button" key={category} className={`filter-button ${selectedCategory === category ? "active" : ""}`} onClick={() => setCategory(category)}>{labels[category]}</button>;
            })}
            <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: "12px" }}>{filteredProducts.length} منتجات</span>
          </div>
          {filteredProducts.length ? <div className="products-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state">لا توجد منتجات في هذا القسم حالياً.</div>}
          <div style={{ textAlign: "center", marginTop: "64px" }}><Link href="/" className="text-link">العودة للرئيسية <span>←</span></Link></div>
        </div>
      </section>
    </main>
  );
}

export default function Products() {
  return <Suspense fallback={<main><section className="inner-hero"><div className="site-container"><h1>المتجر</h1></div></section><div className="empty-state">جاري تحميل المنتجات...</div></main>}><ProductsContent /></Suspense>;
}
