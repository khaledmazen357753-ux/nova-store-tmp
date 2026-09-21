import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gray-100 py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
            Nova Store
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            تسوق أحدث الأحذية والملابس بأفضل الأسعار
          </p>
          <Link href="/products" className="bg-black text-white px-8 py-3 rounded font-semibold hover:bg-gray-800 transition-colors inline-block">
            تسوق الآن
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-800">الأقسام</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/products?category=shoes" className="bg-gray-50 p-8 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-center">
                <div className="text-4xl mb-4">👟</div>
                <h3 className="text-xl font-bold text-gray-800">أحذية</h3>
                <p className="text-gray-600 mt-2">تشكيلة واسعة من الأحذية العصرية</p>
              </div>
            </Link>
            <Link href="/products?category=pants" className="bg-gray-50 p-8 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-center">
                <div className="text-4xl mb-4">👖</div>
                <h3 className="text-xl font-bold text-gray-800">بنطلونات</h3>
                <p className="text-gray-600 mt-2">بنطلونات مريحة بتصاميم متعددة</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-800">منتجات مميزة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">صورة المنتج</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2 text-gray-800">منتج {item}</h3>
                  <p className="text-sm text-gray-600 mb-2">وصف قصير</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">EGP {99 + item * 10}</span>
                    <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                      إضافة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-xl font-bold mb-4">Nova Store</h3>
          <p className="text-gray-400 mb-4">وجهتك الأولى للتسوق الذكي</p>
          <div className="flex justify-center gap-4 mb-4">
            <Link href="/about" className="text-gray-400 hover:text-white">من نحن</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white">اتصل بنا</Link>
          </div>
          <p className="text-gray-500 text-sm">© 2024 Nova Store. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
