"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function Products() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  const allProducts = [
    { id: 1, name: "سنيكرز Nova Air", desc: "خفة وراحة طوال اليوم", price: 599, category: "shoes", discount: 16 },
    { id: 2, name: "حذاء كاجوال جلد", desc: "أناقة يومية", price: 799, category: "shoes", discount: 27 },
    { id: 3, name: "حذاء جري Run Lite", desc: "أداء يومي", price: 699, category: "shoes", discount: 0 },
    { id: 4, name: "جينز سليم فيت", desc: "قصة عملية وأنيقة", price: 499, category: "pants", discount: 0 },
    { id: 5, name: "بوت شتوي سيتي", desc: "دفء وثَبات", price: 899, category: "shoes", discount: 0 },
    { id: 6, name: "حذاء أكسفورد كلاسيك", desc: "حضور رسمي", price: 999, category: "shoes", discount: 0 },
    { id: 7, name: "جينز شينو أسود", desc: "أناقة كلاسيكية", price: 549, category: "pants", discount: 15 },
    { id: 8, name: "بنطلون جوغر بيج", desc: "راحة يومية", price: 479, category: "pants", discount: 0 },
  ];

  const filteredProducts = selectedCategory === "all" 
    ? allProducts 
    : allProducts.filter(product => product.category === selectedCategory);

  const productsPerPage = 4;
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const getCategoryName = (category: string) => {
    switch(category) {
      case "shoes": return "أحذية";
      case "pants": return "بنطلونات";
      case "offers": return "العروض";
      default: return "المتجر";
    }
  };

  return (
    <div className="font-sans min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            {getCategoryName(selectedCategory)}
          </h1>
          <p className="text-lg text-gray-600">
            {selectedCategory === "all" 
              ? "تصفح تشكيلتنا المختارة من الأحذية والبنطلونات"
              : `تصفح تشكيلتنا من ${getCategoryName(selectedCategory)}`
            }
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-4 flex-wrap">
            <button 
              onClick={() => { setSelectedCategory("all"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded font-medium ${
                selectedCategory === "all" 
                  ? "bg-black text-white" 
                  : "border border-gray-300 hover:bg-gray-100"
              }`}
            >
              الكل
            </button>
            <button 
              onClick={() => { setSelectedCategory("shoes"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded font-medium ${
                selectedCategory === "shoes" 
                  ? "bg-black text-white" 
                  : "border border-gray-300 hover:bg-gray-100"
              }`}
            >
              أحذية
            </button>
            <button 
              onClick={() => { setSelectedCategory("pants"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded font-medium ${
                selectedCategory === "pants" 
                  ? "bg-black text-white" 
                  : "border border-gray-300 hover:bg-gray-100"
              }`}
            >
              بنطلونات
            </button>
            <button 
              onClick={() => { setSelectedCategory("offers"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded font-medium ${
                selectedCategory === "offers" 
                  ? "bg-black text-white" 
                  : "border border-gray-300 hover:bg-gray-100"
              }`}
            >
              العروض
            </button>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {currentProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center relative">
                    <span className="text-gray-400">صورة المنتج</span>
                    {product.discount > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        خصم {product.discount}%
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 text-gray-900">{product.name}</h3>
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
          ) : (
            <div className="text-center py-12 text-gray-500">
              لا توجد منتجات في هذا القسم
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto flex justify-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              السابق
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded ${
                  currentPage === i + 1 
                    ? "bg-black text-white" 
                    : "border hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </section>
      )}
    </div>
  );
}