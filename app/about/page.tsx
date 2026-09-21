import Link from "next/link";

export default function AboutUs() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">من نحن - Nova Store</h1>
          <p className="text-xl opacity-90">وجهتك الأولى للتسوق الذكي والعصري</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">أهلاً بك في Nova Store</h2>
            
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              نؤمن بأن التسوق عبر الإنترنت يجب أن يكون تجربة ممتعة، سهلة، وآمنة بالكامل. لذلك، تأسس Nova Store لنقدم لك تشكيلة مختارة بعناية فائقة من المنتجات التي تلبي احتياجاتك اليومية وتضيف لمسة من التميز لحياتك، مع التركيز الدائم على أعلى معايير الجودة وأفضل الأسعار.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">لماذا تختار التسوق من Nova Store؟</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">جودة موثوقة</h4>
                  <p className="text-gray-600">نختار منتجاتنا بدقة لضمان حصولك على الأفضل دائماً.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">سهولة التسوق والدفع</h4>
                  <p className="text-gray-600">نوفر لك خيارات دفع مرنة وآمنة تشمل الدفع عند الاستلام.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">خدمة عملاء راقية</h4>
                  <p className="text-gray-600">فريقنا جاهز دائماً لمساعدتك والإجابة عن كل استفساراتك قبل وبعد الشراء.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <p className="text-lg text-gray-700 text-center font-medium">
                شكراً لاختيارك Nova Store.. نحن هنا لنلهم يومك ونلبي تطلعاتك!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">هل لديك استفسار؟</h2>
          <p className="text-gray-600 mb-6">فريقنا جاهز لمساعدتك في أي وقت</p>
          <Link 
            href="/contact" 
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
          >
            تواصل معنا
          </Link>
        </div>
      </section>
    </div>
  );
}