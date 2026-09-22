"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";

function BagIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon">
      <path d="M5.5 8.5h13l-.7 11.2H6.2L5.5 8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 9V6.8a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon">
      <circle cx="10.8" cy="10.8" r="5.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.2 15.2 4.3 4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <header className="site-header">
      <div className="announcement-bar">
        <div className="site-container announcement-inner">
          <span>شحن مجاني للطلبات فوق 800 ج.م</span>
          <span className="announcement-separator" />
          <span>الدفع عند الاستلام متاح لكل المحافظات</span>
          <Link href="/shipping">اعرف المزيد <span aria-hidden="true">←</span></Link>
        </div>
      </div>

      <nav className="main-nav" aria-label="التنقل الرئيسي">
        <div className="site-container nav-inner">
          <Link href="/" className="brand" onClick={() => setIsMenuOpen(false)} aria-label="Nova Store - الرئيسية">
            <span className="brand-mark">N</span>
            <span className="brand-text">NOVA <em>STORE</em></span>
          </Link>

          <div className={`nav-links ${isMenuOpen ? "is-open" : ""}`}>
            <Link href="/" onClick={() => setIsMenuOpen(false)}>الرئيسية</Link>
            <Link href="/products" onClick={() => setIsMenuOpen(false)}>المتجر</Link>
            <Link href="/products?gender=men" onClick={() => setIsMenuOpen(false)}>رجالي</Link>
            <Link href="/products?gender=women" onClick={() => setIsMenuOpen(false)}>حريمي</Link>
            <Link href="/products?category=shoes" onClick={() => setIsMenuOpen(false)}>أحذية</Link>
            <Link href="/products?category=pants" onClick={() => setIsMenuOpen(false)}>بنطلونات</Link>
            <Link href="/products?category=offers" onClick={() => setIsMenuOpen(false)} className="nav-sale">العروض</Link>
            <Link href="/about" onClick={() => setIsMenuOpen(false)}>قصتنا</Link>
          </div>

          <div className="nav-actions">
            <Link href="/products" className="nav-icon-button search-action" aria-label="تصفح المنتجات">
              <SearchIcon />
            </Link>
            <Link href="/cart" className="cart-link" aria-label={`السلة، ${totalItems} منتجات`}>
              <BagIcon />
              <span className="cart-label">السلة</span>
              <span className="cart-count">{totalItems}</span>
            </Link>
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={isMenuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
