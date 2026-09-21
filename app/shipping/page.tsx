import Link from "next/link";

export default function Shipping() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">سياسة الشحن والتوصيل</h1>
          <p className="text-lg opacity-90">كل ما تحتاج معرفته عن طرق الشحن والتوصيل</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">طرق الشحن المتاحة</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg">الشحن القياسي</h3>
                  <p className="text-gray-600">التوصيل خلال 3-5 أيام عمل - مجاني للطلبات فوق 300 جنيه</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-lg">الشحن السريع</h3>
                  <p className="text-gray-600">التوصيل خلال 1-2 يوم عمل - رسوم 25 جنيه</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-lg">الدفع عند الاستلام</h3>
                  <p className="text-gray-600">التوصيل خلال 3-5 أيام عمل - رسوم 15 جنيه</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">مناطق التوصيل</h2>
              <p className="text-gray-600 mb-4">نوفر خدمة التوصيل لجميع المحافظات المصرية</p>
              <ul className="space-y-2 text-gray-600">
                <li>✓ القاهرة والجيزة - توصيل في 24-48 ساعة</li>
                <li>✓ الإسكندرية - توصيل في 48 ساعة</li>
                <li>✓ باقي المحافظات - توصيل في 3-5 أيام عمل</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">معلومات إضافية</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• يتم الشحن من السبت إلى الخميس</li>
                <li>• يمكن تتبع الطلب من خلال رقم الشحن المرسل</li>
                <li>• يرجى التأكد من العنوان ورقم الهاتف بدقة</li>
                <li>• سيتم التواصل معك قبل التوصيل للتأكد من الاستلام</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}