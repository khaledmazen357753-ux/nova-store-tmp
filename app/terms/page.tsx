export default function Terms() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">الشروط والأحكام</h1>
          <p className="text-lg opacity-90">القواعد التي تحكم استخدامك لموقع Nova Store</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">القبول بالشروط</h2>
              <p className="text-gray-600">
                باستخدامك لموقع Nova Store، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام الموقع.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">المنتجات والأسعار</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• نسعى لعرض دقيق للمنتجات والأسعار</li>
                <li>• نحتفظ بالحق في تغيير الأسعار في أي وقت</li>
                <li>• الصور قد لا تعكس المنتج الفعلي بنسبة 100%</li>
                <li>• الكميات محدودة وقد تنفد</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">الطلبات والدفع</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• الطلب ملزم فقط بعد تأكيد الدفع</li>
                <li>• نحقق من الطلبات لمنع الاحتيال</li>
                <li>• الدفع عند الاستلام متاح في مناطق محددة</li>
                <li>• نحتفظ بالحق في إلغاء الطلبات المشبوهة</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">المسؤولية المحدودة</h2>
              <p className="text-gray-600">
                نحن غير مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الموقع أو المنتجات المباعة فيه.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">الملكية الفكرية</h2>
              <p className="text-gray-600">
                جميع المحتويات والتصاميم والشعارات على الموقع هي ملكية حصرية لـ Nova Store ولا يجوز استخدامها دون إذن.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">تغيير الشروط</h2>
              <p className="text-gray-600">
                نحتفظ بالحق في تعديل هذه الشروط في أي وقت. التعديلات سارية المفعول فور نشرها على الموقع.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">للاستفسار حول الشروط</h3>
              <p className="text-blue-700">
                اتصل بنا على: legal@novastore.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}