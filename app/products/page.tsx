import Link from "next/link";

export default function Products() {
  const products = [
    { id: 1, name: "منتج متميز 1", price: 99, category: "إلكترونيات", image: "صورة" },
    { id: 2, name: "منتج متميز 2", price: 149, category: "أزياء", image: "صورة" },
    { id: 3, name: "منتج متميز 3", price: 79, category: "منزل", image: "صورة" },
    { id: 4, name: "منتج متميز 4", price: 199, category: "إلكترونيات", image: "صورة" },
    { id: 5, name: "منتج متميز 5", price: 129, category: "أزياء", image: "صورة" },
    { id: 6, name: "منتج متميز 6", price: 89, category: "منزل", image: "صورة" },
    { id: 7, name: "منتج متميز 7", price: 179, category: "إلكترونيات", image: "صورة" },
    { id: 8, name: "منتج متميز 8", price: 159, category: "أزياء", image: "صورة" },
  ];

  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">المنتجات</h1>
          <p className="text-lg opacity-90">تصفح تشكيلتنا المميزة من المنتجات عالية الجودة</p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white py-4 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <select className="border rounded-lg px-4 py-2">
              <option>جميع الأقسام</option>
              <option>إلكترونيات</option>
              <option>أزياء</option>
              <option>منزل</option>
            </select>
            <select className="border rounded-lg px-4 py-2">
              <option>السعر: من الأقل للأعلى</option>
              <option>السعر: من الأعلى للأقل</option>
              <option>الأحدث</option>
              <option>الأكثر مبيعاً</option>
            </select>
          </div>
          <div className="text-gray-600">
            عرض {products.length} منتج
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group">
                <div className="h-48 bg-gray-200 flex items-center justify-center relative">
                  <span className="text-gray-400">{product.image}</span>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                    <Link href="/product/1" className="bg-white text-blue-600 px-4 py-2 rounded-full font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-xs text-blue-600 font-semibold">{product.category}</span>
                  <h3 className="font-semibold mb-2">{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">EGP {product.price}</span>
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

      {/* Pagination */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto flex justify-center gap-2">
          <button className="px-4 py-2 border rounded hover:bg-gray-100">السابق</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">1</button>
          <button className="px-4 py-2 border rounded hover:bg-gray-100">2</button>
          <button className="px-4 py-2 border rounded hover:bg-gray-100">3</button>
          <button className="px-4 py-2 border rounded hover:bg-gray-100">التالي</button>
        </div>
      </section>
    </div>
  );
}