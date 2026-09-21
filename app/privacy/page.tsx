export default function Privacy() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">سياسة الخصوصية</h1>
          <p className="text-lg opacity-90">كيف نحمي بياناتك وخصوصيتك</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">مقدمة</h2>
              <p className="text-gray-600">
                نحن في Nova Store نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">البيانات التي نجمعها</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• الاسم وعنوان البريد الإلكتروني</li>
                <li>• رقم الهاتف والعنوان للشحن</li>
                <li>• معلومات الدفع (مشفرة وآمنة)</li>
                <li>• بيانات التصفح واستخدام الموقع</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">كيف نستخدم بياناتك</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• معالجة الطلبات والشحن</li>
                <li>• تحسين تجربة التسوق</li>
                <li>• إرسال عروض وتحديثات (بموافقتك)</li>
                <li>• حماية من الاحتيال</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">حماية البيانات</h2>
              <p className="text-gray-600">
                نستخدم تشفير SSL لحماية بياناتك أثناء النقل. نحتفظ ببياناتك في خوادم آمنة ولا نشاركها مع أطراف ثالثة دون إذنك.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">حقوقك</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• الوصول إلى بياناتك وتعديلها</li>
                <li>• طلب حذف بياناتك</li>
                <li>• إلغاء الاشتراك في الرسائل التسويقية</li>
                <li>• تقديم شكوى لجهات حماية البيانات</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">للاستفسار حول الخصوصية</h3>
              <p className="text-blue-700">
                اتصل بنا على: privacy@novastore.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}