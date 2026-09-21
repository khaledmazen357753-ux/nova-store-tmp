import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Nova Store - وجهتك الأولى للتسوق الذكي
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            تجربة تسوق ممتعة، سهلة، وآمنة بالكامل
          </p>
          <Link href="/products" className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors inline-block">
            تسوق الآن
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">🚚</div>
            <h3 className="font-semibold">شحن سريع</h3>
            <p className="text-sm text-gray-600">توصيل في أقل من 48 ساعة</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">💳</div>
            <h3 className="font-semibold">دفع آمن</h3>
            <p className="text-sm text-gray-600">حماية كاملة لبياناتك</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">🔄</div>
            <h3 className="font-semibold">استبدال سهل</h3>
            <p className="text-sm text-gray-600">ضمان استرجاع 14 يوم</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">📞</div>
            <h3 className="font-semibold">دعم 24/7</h3>
            <p className="text-sm text-gray-600">خدمة عملاء متواصلة</p>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">الأقسام المميزة</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative h-64 bg-gradient-to-br from-pink-400 to-red-500 rounded-2xl flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer">
              <div className="text-center">
                <div className="text-4xl mb-2">👗</div>
                <h3 className="text-2xl font-bold">الأزياء</h3>
              </div>
            </div>
            <div className="relative h-64 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer">
              <div className="text-center">
                <div className="text-4xl mb-2">📱</div>
                <h3 className="text-2xl font-bold">الإلكترونيات</h3>
              </div>
            </div>
            <div className="relative h-64 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center text-white hover:scale-105 transition-transform cursor-pointer">
              <div className="text-center">
                <div className="text-4xl mb-2">🏠</div>
                <h3 className="text-2xl font-bold">المنزل</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">الأكثر مبيعاً</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">صورة المنتج</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">منتج متميز {item}</h3>
                  <p className="text-sm text-gray-600 mb-2">وصف قصير للمنتج</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">EGP {99 + item * 10}</span>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">آراء عملائنا</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {item}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold">عميل راضي {item}</h4>
                    <div className="text-yellow-400">⭐⭐⭐⭐⭐</div>
                  </div>
                </div>
                <p className="text-gray-600">
                  تجربة تسوق رائعة! المنتجات عالية الجودة والخدمة ممتازة. سأعود بالتأكيد للتسوق من Nova Store.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">ابدأ تسوقك الآن</h2>
          <p className="text-xl mb-8 opacity-90">
            استمتع بتجربة تسوق فريدة مع منتجات عالية الجودة وأسعار منافسة
          </p>
          <Link href="/products" className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors inline-block">
            تصفح المنتجات
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Nova Store</h3>
            <p className="text-gray-400">وجهتك الأولى للتسوق الذكي والعصري</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-white">من نحن</Link></li>
              <li><Link href="/products" className="hover:text-white">المنتجات</Link></li>
              <li><Link href="/contact" className="hover:text-white">اتصل بنا</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">سياسات المتجر</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/shipping" className="hover:text-white">سياسة الشحن</Link></li>
              <li><Link href="/returns" className="hover:text-white">سياسة الاسترجاع</Link></li>
              <li><Link href="/privacy" className="hover:text-white">سياسة الخصوصية</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">تواصل معنا</h4>
            <div className="flex space-x-4 text-2xl">
              <a href="#" className="hover:text-blue-400">📘</a>
              <a href="#" className="hover:text-pink-400">📷</a>
              <a href="#" className="hover:text-blue-300">🐦</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>© 2024 Nova Store. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
