import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gray-50 py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
                أحذية وبنطلونات ترفع إطلالتك من أول خطوة
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                تشكيلة مختارة للبس اليومي والمناسبات. جودة واضحة، أسعار مباشرة، ودفع عند الاستلام.
              </p>
              <div className="flex gap-4">
                <Link href="/products" className="bg-black text-white px-8 py-3 rounded font-semibold hover:bg-gray-800 transition-colors">
                  تسوق الآن
                </Link>
                <Link href="/products?category=offers" className="border-2 border-black text-black px-8 py-3 rounded font-semibold hover:bg-gray-100 transition-colors">
                  العروض الحالية
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xl">صورة أحذية وبنطلونات</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">شحن سريع</h3>
              <p className="text-gray-600">توصيل خلال 2–5 أيام</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💵</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">الدفع عند الاستلام</h3>
              <p className="text-gray-600">ادفع وأنت تستلم طلبك</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">ضمان الاسترجاع</h3>
              <p className="text-gray-600">14 يوماً بدون تعقيد</p>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Products */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-gray-900">منتجات مختارة</h2>
            <p className="text-gray-600">أحذية وبنطلونات بجودة موثوقة</p>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">أحذية</h3>
              <p className="text-gray-600 mb-4">سنيكرز · كاجوال · بوت · كلاسيك</p>
              <Link href="/products?category=shoes" className="text-gray-900 font-medium hover:underline">
                عرض الكل →
              </Link>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">بنطلونات</h3>
              <p className="text-gray-600 mb-4">جينز · شينو · جوغر · كارجو</p>
              <Link href="/products?category=pants" className="text-gray-900 font-medium hover:underline">
                عرض الكل →
              </Link>
            </div>
          </div>

          {/* Best Sellers */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-8 text-gray-900">الأكثر مبيعاً</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "سنيكرز Nova Air", desc: "خفة وراحة طوال اليوم", price: 599, discount: 16 },
                { name: "حذاء كاجوال جلد", desc: "أناقة يومية", price: 799, discount: 27 },
                { name: "حذاء جري Run Lite", desc: "أداء يومي", price: 699, discount: 0 },
                { name: "جينز سليم فيت", desc: "قصة عملية وأنيقة", price: 499, discount: 0 }
              ].map((product, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center relative">
                    <span className="text-gray-400">صورة المنتج</span>
                    {product.discount > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        خصم {product.discount}%
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold mb-1 text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{product.desc}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">EGP {product.price}</span>
                      <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                        أضف للسلة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Arrivals */}
          <div>
            <h3 className="text-2xl font-bold mb-8 text-gray-900">الأحدث وصولاً</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "سنيكرز Nova Air", desc: "خفة وراحة طوال اليوم", price: 599 },
                { name: "بوت شتوي سيتي", desc: "دفء وثَبات", price: 899 },
                { name: "حذاء أكسفورد كلاسيك", desc: "حضور رسمي", price: 999 },
                { name: "جينز سليم فيت", desc: "قصة عملية وأنيقة", price: 499 }
              ].map((product, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">صورة المنتج</span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold mb-1 text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{product.desc}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">EGP {product.price}</span>
                      <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                        أضف للسلة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-gray-900">آراء العملاء</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { review: "الجينز ممتاز والخامة تقيلة. الشحن وصل تاني يوم والدفع عند الاستلام سهّل الموضوع." },
              { review: "السنيكرز خفيف وشكله في الحقيقة أحلى من الصور. هكرر الطلب." },
              { review: "طلبت بنطلون شينو وحذاء كاجوال. المقاسات مضبوطة والتغليف محترم." }
            ].map((item, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4 italic">{item.review}</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="ml-3">
                    <div className="font-semibold text-gray-900">عميل راضي</div>
                    <div className="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Nova Store</h3>
              <p className="text-gray-400 text-sm">
                وجهتك للأحذية والبنطلونات المختارة بعناية. تسوق سهل، دفع عند الاستلام، وتجربة موثوقة من أول طلب.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">تسوق</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/products?category=shoes" className="hover:text-white">أحذية</Link></li>
                <li><Link href="/products?category=pants" className="hover:text-white">بنطلونات</Link></li>
                <li><Link href="/products?category=new" className="hover:text-white">الأحدث وصولاً</Link></li>
                <li><Link href="/products?category=offers" className="hover:text-white">العروض</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">الثقة والدعم</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/about" className="hover:text-white">من نحن</Link></li>
                <li><Link href="/shipping" className="hover:text-white">سياسة الشحن والتوصيل</Link></li>
                <li><Link href="/returns" className="hover:text-white">الاستبدال والاسترجاع</Link></li>
                <li><Link href="/contact" className="hover:text-white">اتصل بنا</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">تواصل</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>واتساب: 01000000000</li>
                <li>البريد: hello@novastore.eg</li>
                <li>إنستغرام · فيسبوك · تيك توك</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>© 2026 Nova Store. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
