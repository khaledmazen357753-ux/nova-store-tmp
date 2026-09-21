export default function AboutUs() {
  return (
    <div className="font-sans min-h-screen bg-white">
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">من نحن</h1>
          <p className="text-xl text-gray-600 mb-8">
            Nova Store - وجهتك للأحذية والبنطلونات المختارة بعناية
          </p>
          
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">قصتنا</h2>
            <p className="text-gray-700 mb-4">
              نؤمن بأن الأحذية والبنطلونات ليست مجرد ملابس، بل هي أسلوب حياة. تأسس Nova Store ليقدم للعملاء المصريين تشكيلة مختارة من الأحذية والبنطلونات التي تجمع بين الجودة والأسعار المناسبة.
            </p>
            <p className="text-gray-700">
              نختار منتجاتنا بعناية فائقة من مصادر موثوقة، ونركز على الجودة والراحة والتصميم العصري. مع خيارات دفع مرنة تشمل الدفع عند الاستلام، والتوصيل السريع لجميع محافظات مصر.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-bold mb-2 text-gray-900">رؤيتنا</h3>
              <p className="text-gray-600 text-sm">
                أن نكون الخيار الأول للأحذية والبنطلونات في مصر من خلال الجودة والخدمة المتميزة.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-3xl mb-4">💎</div>
              <h3 className="font-bold mb-2 text-gray-900">قيمنا</h3>
              <p className="text-gray-600 text-sm">
                الجودة، الصدق، والالتزام برضا العملاء في كل خطوة.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="font-bold mb-2 text-gray-900">التزامنا</h3>
              <p className="text-gray-600 text-sm">
                تقديم منتجات عالية الجودة بأسعار مناسبة مع خدمة عملاء ممتازة.
              </p>
            </div>
          </div>

          <div className="bg-gray-900 text-white p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">لماذا Nova Store؟</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• تشكيلة مختارة من الأحذية والبنطلونات</li>
              <li>• جودة موثوقة وأسعار مباشرة</li>
              <li>• دفع عند الاستلام في جميع المحافظات</li>
              <li>• شحن سريع خلال 2-5 أيام</li>
              <li>• ضمان استرجاع 14 يوم</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}