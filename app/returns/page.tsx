import Link from "next/link";

export default function Returns() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">سياسة الاستبدال والاسترجاع</h1>
          <p className="text-lg opacity-90">ضمان استبدال واسترجاع مرن لراحتك</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">فترة الاسترجاع</h2>
              <p className="text-gray-600 mb-4">
                يمكنك استرجاع المنتجات خلال 14 يوماً من تاريخ الاستلام، بشرط أن تكون المنتجات في حالتها الأصلية غير مستخدمة.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">شروط الاسترجاع</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• المنتج يجب أن يكون في حالته الأصلية مع جميع الملحقات</li>
                <li>• العلامة التجارية والتغليف يجب أن تكون سليمة</li>
                <li>• يرجى تقديم إيصال الشراء الأصلي</li>
                <li>• المنتجات الشخصية (مثل السماعات الداخلية) لا يتم استرجاعها لأسباب صحية</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">كيفية طلب الاسترجاع</h2>
              <ol className="space-y-2 text-gray-600 list-decimal list-inside">
                <li>تواصل مع خدمة العملاء عبر الهاتف أو البريد الإلكتروني</li>
                <li>قدم رقم الطلب وسبب الاسترجاع</li>
                <li>سيتم مراجعة الطلب خلال 24 ساعة</li>
                <li>سيتم ترتيب استلام المنتج من عندك</li>
                <li>سيتم إرجاع المبلغ خلال 5-7 أيام عمل</li>
              </ol>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">الاستبدال</h2>
              <p className="text-gray-600 mb-4">
                يمكن استبدال المنتجات بنفس المنتج أو بمنتج آخر بنفس القيمة أو أعلى خلال 14 يوماً من الاستلام.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">للاستفسار حول الاسترجاع</h3>
              <p className="text-blue-700">
                اتصل بنا على: 01000000000 أو راسلنا على: support@novastore.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}