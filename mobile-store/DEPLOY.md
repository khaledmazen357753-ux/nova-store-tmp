# 🚀 دليل نشر موقع VOLT على الإنترنت وجوجل

الموقع جاهز للنشر بالكامل. اختر الطريقة اللي تناسبك:

---

## الطريقة الأسرع: GitHub Pages (مجاني — دقيقة واحدة)

النسخة الجاهزة للنشر موجودة جاهزة في مجلد `docs/` على فرع العمل.

### الخطوات:
1. افتح الريبو على GitHub: [khaledmazen357753-ux/nova-store-tmp](https://github.com/khaledmazen357753-ux/nova-store-tmp)
2. ادخل على **Settings** → **Pages** (من القائمة الجانبية)
3. في قسم **Build and deployment** → **Branch**:
   - اختار الفرع: `arena/01a0dad3-nova-store-tmp`
   - المجلد: `/ (root)` ← **لا** — اختار **`/docs`**
   - دوس **Save**
4. استنى دقيقة — والموقع هيبقى لايف على:
   ```
   https://khaledmazen357753-ux.github.io/nova-store-tmp/
   ```

> ⚠️ ملحوظة: لو دمجت شغلنا على فرع `main` بعدين، غيّر اختيار الفرع في Pages لـ main.

### إعادة البناء بعد أي تعديل (للمرجعية):
```bash
cd mobile-store
STATIC_EXPORT=1 BASE_PATH=/nova-store-tmp \
NEXT_PUBLIC_SITE_URL=https://khaledmazen357753-ux.github.io/nova-store-tmp \
npx next build --turbopack
cp -r out/* ../docs/
```

---

## الطريقة الأفضل للبراند: Vercel (مجاني + دومين مخصص بعدين)

Vercel أحسن استضافة لـ Next.js — وأسرع أداء، وبيدعم دومين خاص (voltstore.eg مثلاً).

1. افتح [vercel.com](https://vercel.com) وسجّل دخول بـ **Continue with GitHub**
2. **Add New** → **Project** → اختار ريبو `nova-store-tmp`
3. في إعدادات الاستيراد:
   - **Root Directory:** `mobile-store`
   - Framework: هيتكشف تلقائياً (Next.js)
   - **Environment Variables** (اختياري هنا — الافتراضي يشتغل على دومين Vercel):
     - `NEXT_PUBLIC_SITE_URL` = رابط موقعك بعد ما يتولد (مثل `https://volt-store.vercel.app`)
4. دوس **Deploy** — وخلاص 🎉

لما تضيف دومين مخصص في Vercel، حدّث `NEXT_PUBLIC_SITE_URL` بيه وأعد النشر.

---

## 📊 التسجيل في Google Search Console (عشان يظهر في نتائج البحث)

بعد ما الموقع يبقى لايف على لينك نهائي:

1. افتح [search.google.com/search-console](https://search.google.com/search-console)
2. **Add property** → **URL prefix** → الصق رابط موقعك
3. **التحقق من الملكية** — أسهل طريقة: **HTML tag**
   - هيديك كود زي: `<meta name="google-site-verification" content="abc123..." />`
   - **ابعتلي الكود ده هنا** — هضيفه في الموقع وأبني وأرفع، وبعدين دوس Verify
4. بعد التحقق: **Sitemaps** → اكتب `sitemap.xml` → Submit
5. استخدم **URL Inspection** → **Request Indexing** للرئيسية لتسريع الفهرسة

### جاهز أصلاً في الموقع (مش محتاج تعمل حاجة):
- ✅ `sitemap.xml` تلقائي (17 رابط)
- ✅ `robots.txt` مفتوح لجوجل
- ✅ Metadata كاملة (عناوين، أوصاف، OpenGraph عربي)
- ✅ **JSON-LD** بيانات منظمة: مخطط OnlineStore + Product لكل منتج (أسعار EGP + تقييمات) — دي اللي بتخلي جوجل يعرض النجوم والأسعار في نتايج البحث

### توقعات واقعية:
- الفهرسة الأولية: من أيام لأسبوعين
- النجوم والأسعار في النتائج (Rich Results): بعد أسابيع لما جوجل يثق في الموقع
- **مهم جداً:** محتوى حقيقي (منتجات وأسعار فعلي) + دومين مخصص = ترتيب أحسن بكتير

---

## ✅ قبل ما تعلن عن الموقع رسمياً (توصيات)

| البند | الحالة الحالية | المطلوب قبل الإطلاق التجاري |
|---|---|---|
| أرقام التواصل | أرقام تجريبية (01000000000) | رقم واتساب حقيقي |
| الإيميل | hello@voltstore.eg تجريبي | إيميل حقيقي |
| الدفع | COD + محاكاة إلكتروني | ربط بوابة دفع (فوري/باي موب/كاش فلو) |
| المنتجات | بيانات تجريبية (14 منتج) | منتجات وأسعار وصور حقيقية |
| التتبع | localStorage تجريبي | ربط API حقيقي |
