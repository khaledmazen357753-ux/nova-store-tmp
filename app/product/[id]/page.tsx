import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "../../components/AddToCartButton";
import ProductCard from "../../components/ProductCard";
import { formatPrice, products } from "../../lib/products";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((item) => item.id === Number(id));
  if (!product) notFound();

  const relatedProducts = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);

  return (
    <main>
      <section className="page-content section-light"><div className="site-container"><Link href="/products" className="text-link" style={{ margin: "0 0 30px" }}>العودة للمتجر <span>→</span></Link><div className="detail-layout"><div className="detail-image"><Image src={product.image} alt={product.name} fill priority sizes="(max-width: 680px) 100vw, 55vw" /></div><div className="detail-info"><span className="eyebrow">{product.brand} · {product.genderLabel} · {product.categoryLabel}</span><h1>{product.name}</h1><div className="detail-rating">★★★★★ <span>{product.rating} · {product.reviewCount} تقييم</span></div><p className="detail-description">{product.description}. تصميم عملي وخامة مريحة، معمول عشان يعيش معك من أول مشوار الصباح لآخر خروجة في اليوم.</p><div className="detail-price">{formatPrice(product.price)} <small>ج.م</small>{product.oldPrice && <del>{formatPrice(product.oldPrice)} ج.م</del>}</div><AddToCartButton product={product} /><div className="detail-benefits"><div><strong>توصيل سريع</strong><span>2–5 أيام عمل</span></div><div><strong>استرجاع سهل</strong><span>خلال 14 يوماً</span></div><div><strong>دفع آمن</strong><span>عند الاستلام</span></div></div></div></div></div></section>
      <section className="section section-white"><div className="site-container"><div className="section-heading"><div><span className="eyebrow">قد يعجبك أيضاً</span><h2>قطع تكمل اختيارك</h2></div></div><div className="products-grid">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></div></section>
    </main>
  );
}
