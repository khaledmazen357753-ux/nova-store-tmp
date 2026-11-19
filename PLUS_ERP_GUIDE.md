# دليل تفعيل ونشر منظومة المحاسبي Plus (على 3 دومينات مستقلة)

تم تجهيز منظومة **المحاسبي Plus** بالكامل كـ **3 مشاريع مستقلة** (`plus-backend`، `plus-frontend`، `plus-admin`) بحيث يُنشر كل واحد منها على **دومين منفصل تماماً** عن `nova-store-tmp` ودون أي تأثير على ملفات المتجر القديم.

---

## الخطوة الأولى: اعتماد التغييرات على الفرع الرئيسي (`main`) في GitHub
بعد دمج طلب السحب (Pull Request) الخاص بهذا الفرع إلى `main`، تصبح المجلدات الثلاثة متاحة مباشرة للنشر السحابي الفوري.

---

## الخطوة الثانية: النشر السريع على 3 دومينات مستقلة عبر Vercel (بضغطة زر)

### 1. نشر الخادم وقاعدة البيانات أولاً (`plus-backend`)
- افتح الرابط المباشر لإنشاء مشروع مستقل للـ Backend على Vercel:
  👉 **[نشر Plus Backend API على دومين مستقل](https://vercel.com/new/import?s=https://github.com/khaledmazen357753-ux/nova-store-tmp/tree/main/plus-backend&project-name=plus-erp-api)**
- أو من لوحة Vercel اختر **Add New Project** ← اختر المستودع `nova-store-tmp` ← اضغط **Edit** بجانب **Root Directory** واختر `plus-backend` ← سمِّ المشروع `plus-erp-api` واضغط **Deploy**.
- بعد ثوانٍ ستحصل على رابط الخادم المستقل، مثلاً:
  `https://plus-erp-api.vercel.app` *(انسخ هذا الرابط للخطوتين التاليتين)*.
- *(ملاحظة للإنتاج الدائم الكثيف: ملفا `Dockerfile` و`render.yaml` و`railway.json` جاهزان أيضاً داخل `plus-backend/` إذا رغبت بنشر الخادم على Render أو Railway بقرص تخزين دائم).*

---

### 2. نشر واجهة المحاسبين (`plus-frontend`) على دومينها المستقل
- افتح الرابط المباشر لنشر تطبيق المحاسبي Plus:
  👉 **[نشر تطبيق المحاسبي Plus على دومين مستقل](https://vercel.com/new/import?s=https://github.com/khaledmazen357753-ux/nova-store-tmp/tree/main/plus-frontend&project-name=plus-accounting-erp&env=VITE_API_BASE_URL)**
- في خانة متغير البيئة **`VITE_API_BASE_URL`** ضع رابط الخادم الذي نسخته في الخطوة (1) (مثلاً `https://plus-erp-api.vercel.app`) ثم اضغط **Deploy**.
- سيُنشر التطبيق على دومينه الخاص المستقل مثل: `https://plus-accounting-erp.vercel.app` (أو يمكنك ربط دومين مخصص من تبويب **Settings -> Domains**).

---

### 3. نشر بوابة مدير النظام المستقلة (`plus-admin`) على دومينها المستقل
- افتح الرابط المباشر لنشر بوابة مدير النظام الخاصة بـ Plus:
  👉 **[نشر بوابة مدير النظام Plus Admin على دومين مستقل](https://vercel.com/new/import?s=https://github.com/khaledmazen357753-ux/nova-store-tmp/tree/main/plus-admin&project-name=plus-erp-admin&env=VITE_API_BASE_URL)**
- في خانة **`VITE_API_BASE_URL`** ضع نفس رابط الخادم (`https://plus-erp-api.vercel.app`) واضغط **Deploy**.
- ستحصل على دومين إداري مستقل تماماً مثل: `https://plus-erp-admin.vercel.app`.

---

## بيانات الدخول الجاهزة بعد النشر
- **بوابة مدير النظام (`plus-admin`):** المستخدم `admin` | كلمة المرور `admin123`
- **تطبيق المحاسبي (`plus-frontend`):**
  - رئيس الحسابات: `accountant` / `plus123`
  - مدير النظام: `admin` / `admin123`
  - محاسب المبيعات: `sales` / `plus123`
  - أمين المخزن: `store` / `plus123`
  - الموارد البشرية: `hr` / `plus123`
  - المراجع المالي: `auditor` / `plus123`
