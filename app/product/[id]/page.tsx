import Link from "next/link";

export default function ProductDetail() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">تفاصيل المنتج</h1>
          <p className="text-lg opacity-90">سماعة لاسلكية ذكية - صوت نقي وبطارية تدوم طويلاً</p>
        </div>
      </section>

      {/* Product Details */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Images */}
            <div>
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <div className="h-96 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xl">صورة المنتج الرئيسية</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded shadow p-2 cursor-pointer hover:shadow-md">
                    <div className="h-20 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">صورة {i}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center mb-4">
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                    إلكترونيات
                  </span>
                  <div className="ml-4 text-yellow-400">⭐⭐⭐⭐⭐ (45 تقييم)</div>
                </div>

                <h2 className="text-2xl font-bold mb-4">سماعة لاسلكية ذكية - صوت نقي وبطارية تدوم طويلاً</h2>
                
                <p className="text-gray-600 mb-6">
                  استمتع بتجربة صوتية استثنائية مع سماعاتنا اللاسلكية الذكية. تصميم عصري أنيق، صوت نقي وواضح، وبطارية تدوم طويلاً لتستمتع بالموسيقى طوال اليوم.
                </p>

                <div className="mb-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">EGP 299</div>
                  <div className="text-sm text-gray-500">شامل الضريبة</div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-3">المميزات الأساسية:</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <span className="text-green-500 ml-2">✓</span>
                      تصميم عصري وأنيق يناسب كافة الاستخدامات
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 ml-2">✓</span>
                      خامات عالية الجودة تضمن الاستدامة والتحمل
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 ml-2">✓</span>
                      سهولة الاستخدام والتشغيل الفوري
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 ml-2">✓</span>
                      بطارية تدوم حتى 20 ساعة
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-3">اللون:</h3>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-black border-2 border-blue-500"></button>
                    <button className="w-8 h-8 rounded-full bg-white border-2 border-gray-300"></button>
                    <button className="w-8 h-8 rounded-full bg-blue-500 border-2 border-gray-300"></button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    أضف للسلة
                  </button>
                  <button className="flex-1 border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    اشترِ الآن
                  </button>
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✓ منتج أصلي 100% مع ضمان الاستبدال خلال 14 يوم
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">منتجات مشابهة قد تعجبك</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="h-32 bg-gray-200 rounded mb-4 flex items-center justify-center">
                  <span className="text-gray-400">صورة</span>
                </div>
                <h3 className="font-semibold mb-2">منتج مشابه {item}</h3>
                <div className="flex justify-between items-center">
                  <span className="font-bold">EGP {200 + item * 20}</span>
                  <Link href={`/product/${item}`} className="text-blue-600 hover:underline">عرض</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}