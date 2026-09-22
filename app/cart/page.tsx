"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/CartProvider";
import { formatPrice } from "../lib/products";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <main>
      <section className="inner-hero"><div className="site-container"><span className="eyebrow">خطوتك الأخيرة</span><h1>سلة مشترياتك</h1><p>راجع اختياراتك قبل إتمام الطلب.</p></div></section>
      <section className="page-content section-light">
        <div className="site-container">
          {items.length === 0 ? (
            <div className="empty-cart"><div className="trust-icon" style={{ margin: "0 auto" }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon"><path d="M5.5 8.5h13l-.7 11.2H6.2L5.5 8.5ZM9 9V6.8a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div><h2>السلة لسه فاضية</h2><p>اختار القطع التي تحبها، وسنحتفظ بها هنا.</p><Link href="/products" className="button button-primary">ابدأ التسوق <span className="button-arrow">←</span></Link></div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}><span className="eyebrow">اختياراتك</span><span style={{ color: "var(--muted)", fontSize: "12px" }}>{items.length} قطع</span></div>
                {items.map((item) => (
                  <div className="cart-item" key={`${item.id}-${item.selectedSize}`}>
                    <div className="cart-item-image"><Image src={item.image} alt={item.name} fill sizes="110px" /></div>
                    <div><h3>{item.name}</h3><p>{item.categoryLabel}{item.selectedSize ? ` · المقاس ${item.selectedSize}` : ""}</p><div className="quantity-control"><button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="تقليل الكمية">−</button><span>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="زيادة الكمية">+</button></div><button type="button" className="remove-item" onClick={() => removeItem(item.id)}>إزالة من السلة</button></div>
                    <div className="cart-item-price">{formatPrice(item.price * item.quantity)} ج.م</div>
                  </div>
                ))}
              </div>
              <aside className="summary-card"><h2>ملخص الطلب</h2><div className="summary-row"><span>المجموع الفرعي</span><span>{formatPrice(subtotal)} ج.م</span></div><div className="summary-row"><span>التوصيل</span><span>يُحسب عند التأكيد</span></div><div className="summary-row summary-total"><span>الإجمالي</span><span>{formatPrice(subtotal)} ج.م</span></div><button type="button" className="button button-primary">إتمام الطلب <span className="button-arrow">←</span></button><p style={{ color: "var(--muted)", fontSize: "11px", lineHeight: 1.7, textAlign: "center", margin: "15px 0 0" }}>الدفع عند الاستلام متاح · شحن مجاني فوق 800 ج.م</p></aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
