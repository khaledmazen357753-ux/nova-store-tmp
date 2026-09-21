import Link from "next/link";

export default function Contact() {
  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">اتصل بنا</h1>
          <p className="text-lg opacity-90">نحن هنا لمساعدتك في أي وقت</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">معلومات التواصل</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <span className="text-2xl">📞</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">الهاتف</h3>
                    <p className="text-gray-600">01000000000</p>
                    <p className="text-gray-600">02000000000</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <span className="text-2xl">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">البريد الإلكتروني</h3>
                    <p className="text-gray-600">support@novastore.com</p>
                    <p className="text-gray-600">info@novastore.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">العنوان</h3>
                    <p className="text-gray-600">القاهرة، مصر</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <span className="text-2xl">⏰</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">ساعات العمل</h3>
                    <p className="text-gray-600">السبت - الخميس: 9 ص - 9 م</p>
                    <p className="text-gray-600">الجمعة: مغلق</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-gray-800 mb-4">تابعنا على</h3>
                <div className="flex gap-4 text-3xl">
                  <a href="https://facebook.com/novastore" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">📘</a>
                  <a href="https://instagram.com/novastore" target="_blank" rel="noopener noreferrer" className="hover:text-pink-600">📷</a>
                  <a href="https://twitter.com/novastore" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">🐦</a>
                  <a href="https://wa.me/201000000000" target="_blank" rel="noopener noreferrer" className="hover:text-green-500">💬</a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">أرسل لنا رسالة</h2>
              <form className="bg-white rounded-lg shadow-lg p-8 space-y-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الاسم</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل اسمك"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل بريدك الإلكتروني"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل رقم هاتفك"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الموضوع</label>
                  <select className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>استفسار عام</option>
                    <option>مشكلة في طلب</option>
                    <option>استرجاع / استبدال</option>
                    <option>اقتراح / شكوى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الرسالة</label>
                  <textarea 
                    rows="4"
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اكتب رسالتك هنا"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  إرسال الرسالة
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}