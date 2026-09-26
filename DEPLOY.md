# 🚀 دليل نشر VOLT على الإنترنت وجوجل

> الموقع دلوقتي هو **جذر المشروع** (بعد استبدال Nova Store بالكامل) —
> يعني النشر على Vercel **بدون أي إعدادات خاصة**.

---

## الطريقة الموصى بها: Vercel (مجاني — 3 خطوات)

### لو الريبو متوصل بمشروع Vercel قديم (زي nova-store-tmp.vercel.app):
1. ادمج الـ PR المفتوح على GitHub (أو أي طريقة توصل شغلنا لفرع `main`)
2. Vercel هيعمل deploy تلقائي — وهينشر **VOLT** مكان الموقع القديم على نفس اللينك
3. خلاص 🎉

### لو مش متوصل لسه:
1. افتح [vercel.com](https://vercel.com) → سجّل دخول بـ **Continue with GitHub**
2. **Add New → Project** → اختار ريبو `nova-store-tmp` → دوس **Deploy**
   - مفيش Root Directory ولا أي إعداد — الجذر هو VOLT جاهز
3. خلاص 🎉

### بعد أول نشر (تحسينات اختيارية):
- غيّر اسم المشروع من `nova-store-tmp` لـ `volt-store`:
  **Settings → General → Project Name** → اللينك هيبقى `volt-store.vercel.app`
- ضيف متغير البيئة `NEXT_PUBLIC_SITE_URL` = رابطك النهائي (أو الدومين المخصص):
  **Settings → Environment Variables** → بعدين **Deployments → Redeploy**
  (بدونه الموقع شغال عادي — بيستخدم رابط Vercel التلقائي)

### دومين مخصص (voltstore.eg مثلاً):
**Settings → Domains → Add** → اتبع تعليمات الـ DNS → وحدّث `NEXT_PUBLIC_SITE_URL` بيه.

---

## بديل مجاني: GitHub Pages

```bash
# من جذر المشروع
STATIC_EXPORT=1 BASE_PATH=/nova-store-tmp \
NEXT_PUBLIC_SITE_URL=https://khaledmazen357753-ux.github.io/nova-store-tmp \
npx next build --turbopack
rm -rf docs && cp -r out docs
# commit + push، وبعدين: Settings → Pages → Branch + مجلد /docs
```

الرابط هيبقى: `https://khaledmazen357753-ux.github.io/nova-store-tmp/`

---

## 📊 التسجيل في Google Search Console (عشان يظهر في نتائج البحث)

بعد ما الموقع يبقى لايف على لينك نهائي:

1. افتح [search.google.com/search-console](https://search.google.com/search-console)
2. **Add property** → **URL prefix** → الصق رابط موقعك
3. **التحقق من الملكية** — أسهل طريقة: **HTML tag**
   - هيديك كود زي: `<meta name="google-site-verification" content="abc123..." />`
   - ابعت الكود هنا في المحادثة — هيتضاف للموقع ويترفع، وبعدين دوس Verify
   - (أو ضيفه بنفسك: Environment Variable باسم `GOOGLE_SITE_VERIFICATION` في Vercel)
4. بعد التحقق: **Sitemaps** → `sitemap.xml` → **Submit**
5. **URL Inspection** → **Request Indexing** للرئيسية لتسريع الفهرسة

### جاهز أصلاً في الموقع:
- ✅ `sitemap.xml` تلقائي (17 رابط) + `robots.txt` مفتوح
- ✅ Metadata عربية كاملة + OpenGraph
- ✅ **JSON-LD**: مخطط `OnlineStore` + مخطط `Product` لكل منتج (أسعار EGP + تقييمات) —
  دي اللي بتخلي النجوم والأسعار يظهروا في نتايج البحث

### توقعات واقعية:
- الفهرسة الأولية: أيام لأسبوعين
- Rich Results (نجوم وأسعار): بعد ما جوجل يثق في الموقع (أسابيع)
- محتوى حقيقي + دومين مخصص = ترتيب أحسن بكتير

---

## ✅ قبل الإطلاق التجاري (توصيات)

| البند | الحالة الحالية | المطلوب |
|---|---|---|
| أرقام التواصل | تجريبية (01000000000) | رقم واتساب حقيقي |
| الإيميل | hello@voltstore.eg تجريبي | إيميل حقيقي |
| الدفع | COD + محاكاة إلكتروني | بوابة دفع (فوري/باي موب/كاش فلو) |
| المنتجات | بيانات تجريبية (14 منتج) | منتجات وأسعار وصور حقيقية |
| التتبع | localStorage تجريبي | ربط API حقيقي |
