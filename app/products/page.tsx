"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import { products, type Gender } from "../lib/products";

type Category = "all" | "shoes" | "pants" | "offers";
type SortOption = "newest" | "oldest" | "price-asc" | "price-desc" | "best-selling" | "top-rated";

type FilterKey = "category" | "gender" | "brand" | "sort";

const categoryLabels: Record<Category, string> = { all: "الكل", shoes: "أحذية", pants: "بنطلونات", offers: "العروض" };
const sortLabels: Record<SortOption, string> = {
  newest: "مضاف حديثاً",
  oldest: "الأقدم أولاً",
  "price-asc": "السعر: من الأرخص للأغلى",
  "price-desc": "السعر: من الأغلى للأرخص",
  "best-selling": "الأكثر مبيعاً",
  "top-rated": "الأعلى تقييماً",
};
const brandOptions = Array.from(new Set(products.map((product) => product.brand)));

function ProductsContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [selectedGender, setSelectedGender] = useState<Gender | "all">("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");

  useEffect(() => {
    const category = searchParams.get("category");
    const gender = searchParams.get("gender");
    const brand = searchParams.get("brand");
    const sort = searchParams.get("sort");
    setSelectedCategory(category === "shoes" || category === "pants" || category === "offers" ? category : "all");
    setSelectedGender(gender === "men" || gender === "women" ? gender : "all");
    setSelectedBrand(brand && brandOptions.includes(brand) ? brand : "all");
    setSelectedSort(sort && Object.keys(sortLabels).includes(sort) ? sort as SortOption : "newest");
  }, [searchParams]);

  function replaceFilter(key: FilterKey, value: string) {
    const params = new URLSearchParams(window.location.search);
    const isDefault = value === "all" || (key === "sort" && value === "newest");
    if (isDefault) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/products?${query}` : "/products");
  }

  function setCategory(category: Category) {
    setSelectedCategory(category);
    replaceFilter("category", category);
  }

  function setGender(gender: Gender | "all") {
    setSelectedGender(gender);
    replaceFilter("gender", gender);
  }

  function setBrand(brand: string) {
    setSelectedBrand(brand);
    replaceFilter("brand", brand);
  }

  function setSort(sort: SortOption) {
    setSelectedSort(sort);
    replaceFilter("sort", sort);
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all"
      || (selectedCategory === "offers" ? Boolean(product.oldPrice) : product.category === selectedCategory);
    const matchesGender = selectedGender === "all" || product.gender === selectedGender;
    const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
    return matchesCategory && matchesGender && matchesBrand;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (selectedSort) {
      case "oldest": return a.createdAt.localeCompare(b.createdAt);
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "best-selling": return b.salesCount - a.salesCount;
      case "top-rated": return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case "newest":
      default: return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const categoryName = selectedCategory === "shoes" ? "الأحذية" : selectedCategory === "pants" ? "البنطلونات" : selectedCategory === "offers" ? "العروض" : "كل المنتجات";
  const genderName = selectedGender === "men" ? "الرجالي" : selectedGender === "women" ? "الحريمي" : "";

  function clearAllFilters() {
    setSelectedCategory("all");
    setSelectedGender("all");
    setSelectedBrand("all");
    setSelectedSort("newest");
    window.history.replaceState(null, "", "/products");
  }

  return (
    <main>
      <section className="inner-hero">
        <div className="site-container">
          <span className="eyebrow">Nova Store · المجموعة الكاملة</span>
          <h1>{genderName ? `المنتجات ${genderName}` : categoryName}</h1>
          <p>اختار القسم والبرند والترتيب المناسب لك — ووصل لاختيارك في ثواني.</p>
        </div>
      </section>
      <section className="page-content section-light">
        <div className="site-container">
          <div className="catalog-toolbar">
            <div className="catalog-filter-block">
              <span className="filter-label">القسم</span>
              <div className="filter-chips" aria-label="تصنيفات المنتجات">
                {(Object.keys(categoryLabels) as Category[]).map((category) => <button type="button" key={category} className={`filter-button ${selectedCategory === category ? "active" : ""}`} onClick={() => setCategory(category)}>{categoryLabels[category]}</button>)}
              </div>
            </div>
            <div className="catalog-filter-block">
              <span className="filter-label">الجنس</span>
              <div className="filter-chips" aria-label="تصنيف المنتجات حسب الجنس">
                <button type="button" className={`filter-button ${selectedGender === "all" ? "active" : ""}`} onClick={() => setGender("all")}>الكل</button>
                <button type="button" className={`filter-button ${selectedGender === "men" ? "active" : ""}`} onClick={() => setGender("men")}>رجالي</button>
                <button type="button" className={`filter-button ${selectedGender === "women" ? "active" : ""}`} onClick={() => setGender("women")}>حريمي</button>
              </div>
            </div>
            <div className="catalog-selects">
              <label className="catalog-select-label">البرند<select value={selectedBrand} onChange={(event) => setBrand(event.target.value)} aria-label="اختيار البرند"><option value="all">كل البرندات</option>{brandOptions.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label>
              <label className="catalog-select-label">ترتيب حسب<select value={selectedSort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="ترتيب المنتجات">{Object.entries(sortLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            </div>
          </div>
          <div className="catalog-results-bar"><span>{sortedProducts.length} منتجات</span>{(selectedGender !== "all" || selectedBrand !== "all" || selectedCategory !== "all") && <button type="button" className="clear-filters" onClick={clearAllFilters}>مسح الفلاتر ×</button>}<span className="active-sort">{sortLabels[selectedSort]}</span></div>
          {sortedProducts.length ? <div className="products-grid">{sortedProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state">لا توجد منتجات بهذه الاختيارات حالياً. جرّب تغيير الفلاتر.</div>}
          <div style={{ textAlign: "center", marginTop: "64px" }}><Link href="/" className="text-link">العودة للرئيسية <span>←</span></Link></div>
        </div>
      </section>
    </main>
  );
}

export default function Products() {
  return <Suspense fallback={<main><section className="inner-hero"><div className="site-container"><h1>المتجر</h1></div></section><div className="empty-state">جاري تحميل المنتجات...</div></main>}><ProductsContent /></Suspense>;
}
