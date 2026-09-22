import Image from "next/image";
import Link from "next/link";
import ProductCard from "./components/ProductCard";
import { products } from "./lib/products";

function ArrowIcon() {
  return <span className="button-arrow" aria-hidden="true">←</span>;
}

function TrustIcon({ type }: { type: "truck" | "shield" | "refresh" }) {
  if (type === "truck") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon"><path d="M3 6.5h11v10H3zM14 10h3.8l3.2 3.2v3.3H14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="7" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="18" r="1.7" stroke="currentColor" strokeWidth="1.5" /></svg>;
  }
  if (type === "shield") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon"><path d="M12 3.5 19 6v5.2c0 4.5-2.7 7.6-7 9.3-4.3-1.7-7-4.8-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m8.8 12 2.1 2.1 4.4-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="icon"><path d="M20 11a8 8 0 0 0-14.8-3.8L3.5 9M3.5 5v4h4M4 13a8 8 0 0 0 14.8 3.8l1.7-1.8M20.5 19v-4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const featuredProducts = [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4);

  return (
    <main>
      <section className="hero">
        <div className="site-container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">المجموعة الجديدة · 2026</span>
            <h1>أساسياتك اليومية، <span>بأسلوبك.</span></h1>
            <p className="hero-lead">قطع مختارة بعناية لتعيش يومك براحة وأناقة. جودة تلاحظها من أول لمسة، وتصاميم تليق بكل تفاصيلك.</p>
            <div className="hero-actions">
              <Link href="/products" className="button button-primary">اكتشف المجموعة <ArrowIcon /></Link>
              <Link href="/products?category=offers" className="button button-ghost">تصفح العروض</Link>
            </div>
            <p className="hero-note">شحن سريع داخل مصر · <strong>الدفع عند الاستلام</strong> متاح</p>
          </div>
          <div className="hero-visual">
            <span className="hero-number">01</span>
            <div className="hero-image-wrap"><Image src="/hero-editorial.png" alt="سنيكرز وجينز من مجموعة Nova Store الجديدة" fill priority sizes="(max-width: 680px) 100vw, 46vw" /></div>
            <div className="hero-tag">مصمم<br />ليومك</div>
          </div>
        </div>
      </section>

      <section className="section section-light" aria-labelledby="categories-title">
        <div className="site-container">
          <div className="section-heading">
            <div><span className="eyebrow">تسوق حسب ذوقك</span><h2 id="categories-title">اختيارات مصممة<br />لحياتك اليومية</h2></div>
            <p>من أول مشوار الصباح إلى آخر خروجة في اليوم — ستجد القطعة التي تكمل إطلالتك بسهولة.</p>
          </div>
          <div className="category-grid">
            <Link href="/products?category=shoes" className="category-card tall">
              <Image src="/product-sneaker.png" alt="تشكيلة الأحذية" fill sizes="(max-width: 680px) 100vw, 40vw" />
              <div className="category-card-content"><h3>الأحذية</h3><p>راحة تبدأ من أول خطوة</p><span className="text-link">اكتشف التشكيلة <span>←</span></span></div>
            </Link>
            <Link href="/products?category=pants" className="category-card">
              <Image src="/product-jeans.png" alt="تشكيلة البنطلونات" fill sizes="(max-width: 680px) 50vw, 30vw" />
              <div className="category-card-content"><h3>البنطلونات</h3><p>قصة تناسبك تماماً</p><span className="text-link">تسوق الآن <span>←</span></span></div>
            </Link>
            <Link href="/products?category=offers" className="category-card">
              <Image src="/product-loafer.png" alt="عروض Nova Store" fill sizes="(max-width: 680px) 50vw, 30vw" />
              <div className="category-card-content"><h3>العروض</h3><p>اختياراتك المفضلة بسعر أفضل</p><span className="text-link">شاهد العروض <span>←</span></span></div>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-white" aria-labelledby="featured-title">
        <div className="site-container">
          <div className="section-heading">
            <div><span className="eyebrow">مختاراتنا لك</span><h2 id="featured-title">الأكثر طلباً</h2></div>
            <Link href="/products" className="text-link">عرض كل المنتجات <span>←</span></Link>
          </div>
          <div className="products-grid">
            {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      <section className="story-section" aria-labelledby="story-title">
        <div className="site-container">
          <div className="story-grid">
            <div className="story-copy">
              <span className="eyebrow">لماذا Nova؟</span>
              <h2 id="story-title">نؤمن أن القطعة الصح تغيّر يومك.</h2>
              <p>نبحث عن التفاصيل التي تصنع فرقاً حقيقياً: خامات مريحة، قصّات عملية، وألوان تظل جميلة مع الوقت. لا نضيف شيئاً لمجرد الإضافة — كل قطعة لها سبب.</p>
              <div className="story-points">
                <div className="story-point"><span className="story-point-number">01</span><div><strong>اختيارات مدروسة</strong><span>تشكيلة صغيرة، لكن كل قطعة تستحق مكانها.</span></div></div>
                <div className="story-point"><span className="story-point-number">02</span><div><strong>جودة واضحة</strong><span>خامات مريحة تعيش معك أكثر.</span></div></div>
              </div>
              <Link href="/about" className="text-link">تعرف على قصتنا <span>←</span></Link>
            </div>
            <div className="story-image"><Image src="/hero-editorial.png" alt="تفاصيل من اختيارات Nova Store" fill sizes="(max-width: 680px) 90vw, 45vw" /></div>
          </div>
          <div className="trust-row">
            <div className="trust-item"><span className="trust-icon"><TrustIcon type="truck" /></span><div><strong>توصيل سريع</strong><p>من 2 إلى 5 أيام لكل المحافظات</p></div></div>
            <div className="trust-item"><span className="trust-icon"><TrustIcon type="shield" /></span><div><strong>تسوق بثقة</strong><p>دفع عند الاستلام واسترجاع خلال 14 يوم</p></div></div>
            <div className="trust-item"><span className="trust-icon"><TrustIcon type="refresh" /></span><div><strong>خدمة من القلب</strong><p>فريقنا هنا لمساعدتك قبل وبعد الطلب</p></div></div>
          </div>
        </div>
      </section>

      <section className="section section-dark" aria-labelledby="reviews-title">
        <div className="site-container">
          <div className="section-heading"><div><span className="eyebrow">قالوا عنا</span><h2 id="reviews-title">تجارب حقيقية<br />من ناس مثلّك</h2></div><p>رضا عملائنا هو المقياس الحقيقي لكل ما نفعله.</p></div>
          <div className="review-grid">
            <figure className="review-card"><div className="review-stars">★★★★★</div><blockquote>“السنيكرز مريح جداً وشكله في الحقيقة أحلى من الصور. بقى اختياري اليومي.”</blockquote><figcaption className="review-author">محمد · القاهرة</figcaption></figure>
            <figure className="review-card"><div className="review-stars">★★★★★</div><blockquote>“الخامة ممتازة والمقاس مظبوط. تجربة شراء سهلة والتغليف محترم جداً.”</blockquote><figcaption className="review-author">سارة · الإسكندرية</figcaption></figure>
            <figure className="review-card"><div className="review-stars">★★★★★</div><blockquote>“طلبت الجينز ووصل بسرعة. القصة مريحة واللون بالضبط زي الصورة.”</blockquote><figcaption className="review-author">عمر · الجيزة</figcaption></figure>
          </div>
        </div>
      </section>

      <section className="newsletter">
        <div className="site-container newsletter-inner">
          <div><h2>خليك أول واحد يعرف.</h2><p>اشترك ليصلك جديدنا وعروضنا الخاصة قبل الجميع.</p></div>
          <form className="newsletter-form"><input type="email" aria-label="البريد الإلكتروني" placeholder="بريدك الإلكتروني" required /><button type="submit">اشترك الآن ←</button></form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-container">
          <div className="footer-grid">
            <div className="footer-brand"><Link href="/" className="brand"><span className="brand-mark">N</span><span className="brand-text" style={{ color: "white" }}>NOVA <em>STORE</em></span></Link><p>أساسياتك اليومية، بلمسة تشبهك. اختيارات بعناية من مصر.</p></div>
            <div><h3 className="footer-title">تسوق</h3><div className="footer-links"><Link href="/products">كل المنتجات</Link><Link href="/products?category=shoes">أحذية</Link><Link href="/products?category=pants">بنطلونات</Link><Link href="/products?category=offers">العروض</Link></div></div>
            <div><h3 className="footer-title">مساعدتك</h3><div className="footer-links"><Link href="/about">قصتنا</Link><Link href="/shipping">الشحن والتوصيل</Link><Link href="/returns">الاستبدال والاسترجاع</Link><Link href="/contact">تواصل معنا</Link></div></div>
            <div className="footer-contact"><h3 className="footer-title">تواصل معنا</h3><strong>واتساب</strong><br />01000000000<br /><strong>البريد الإلكتروني</strong><br />hello@novastore.eg</div>
          </div>
          <div className="footer-bottom"><span>© 2026 Nova Store. جميع الحقوق محفوظة.</span><span>صُنع بحب في مصر · <Link href="/terms">الشروط والأحكام</Link> · <Link href="/privacy">الخصوصية</Link></span></div>
        </div>
      </footer>
    </main>
  );
}
