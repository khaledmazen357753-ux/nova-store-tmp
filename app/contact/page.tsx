export default function Contact() {
  return (
    <div className="font-sans min-h-screen bg-white">
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">اتصل بنا</h1>
          <p className="text-xl text-gray-600 mb-8">
            فريقنا جاهز لمساعدتك في أي وقت
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">معلومات التواصل</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="text-2xl mr-4">📞</div>
                  <div>
                    <div className="font-semibold text-gray-900">واتساب</div>
                    <div className="text-gray-600">01000000000</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-2xl mr-4">📧</div>
                  <div>
                    <div className="font-semibold text-gray-900">البريد الإلكتروني</div>
                    <div className="text-gray-600">hello@novastore.eg</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-2xl mr-4">📍</div>
                  <div>
                    <div className="font-semibold text-gray-900">العنوان</div>
                    <div className="text-gray-600">القاهرة، مصر</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-4">تابعنا على</h3>
                <div className="flex gap-4 text-2xl">
                  <a href="#" className="hover:text-blue-600">📘</a>
                  <a href="#" className="hover:text-pink-600">📷</a>
                  <a href="#" className="hover:text-blue-400">🐦</a>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">أرسل لنا رسالة</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الاسم</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="أدخل اسمك"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="أدخل بريدك الإلكتروني"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الرسالة</label>
                  <textarea 
                    rows={4}
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="اكتب رسالتك هنا"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
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