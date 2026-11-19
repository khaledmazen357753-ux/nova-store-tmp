# المحاسبي Plus — حالة التشغيل الفعلي (Live Verification)

آخر تحقق: **2026-11-19** — تم تشغيل المنظومة بالكامل وإجراء دورة محاسبية كاملة داخل التطبيق.

---

## 1) النسخة الحيّة داخل بيئة المعاينة (Live Preview)

| التطبيق | المنفذ | الحالة | ملاحظة |
| --- | --- | --- | --- |
| 🧾 تطبيق المحاسبي Plus (لوحة المحاسبين) | **3001** | يعمل ✅ | Vite dev server + بروكسي `/api` إلى الخادم |
| 👑 بوابة مدير النظام Plus Admin | **3002** | يعمل ✅ | مستقلة تماماً عن لوحة المحاسبين |
| ⚙️ خادم البيانات Plus Backend | **4000** | يعمل ✅ | Express + SQLite، 30 جدولاً |

افتح لوحة **Live Preview** بجانب المحادثة واضغط المنفذ **3001** لتطبيق المحاسبي، و**3002** لبوابة مدير النظام.

---

## 2) النسخة السحابية الدائمة (Vercel)

| التطبيق | الرابط |
| --- | --- |
| تطبيق المحاسبي Plus | https://plus-accounting-erp.vercel.app |
| بوابة مدير النظام | https://plus-erp-admin.vercel.app |
| خادم البيانات API | https://plus-erp-api.vercel.app |

فحص الخادم: https://plus-erp-api.vercel.app/api/health

---

## 3) نتائج الاختبار الفعلي (دورة محاسبية كاملة)

| العملية | المسار | النتيجة |
| --- | --- | --- |
| تسجيل الدخول | `POST /api/auth/login` | ✅ 200 — `CHIEF_ACCOUNTANT` |
| قيد غير متوازن | `POST /api/transactions/journal-entries` | ✅ **مرفوض 400**: «إجمالي المدين (1000) لا يساوي الدائن (500)» |
| قيد متوازن | `POST /api/transactions/journal-entries` | ✅ 201 — `JE-1010` |
| لوحة التحكم (KPIs) | `GET /api/reports/dashboard` | ✅ 200 — نقدية 876,034 • عملاء 227,025 • موردون 166,000 • مخزون 485,000 |
| ميزان المراجعة | `GET /api/reports/financial?type=trial-balance` | ✅ المدين = الدائن (3,794,650) |
| فاتورة بيع | `POST /api/transactions/sales-invoices` | ✅ 201 — `SINV-1004`، خصم 10% ⇒ صافي 9,000، ورصيد العميل +9,000، والمخزون −2 |
| قيد اليومية التلقائي للفاتورة | — | ✅ `JE-1011` |
| أمر توريد | `POST /api/transactions/purchase-orders` | ✅ 201 — `PO-1003` بمبلغ 72,000 |
| فاتورة شراء | `POST /api/transactions/purchase-invoices` | ✅ 201 — `PINV-1002`، صافي 285,000، والمخزون +10 |
| إذن إضافة مخزن | `POST /api/transactions/stock-additions` | ✅ 201 — `ADD-1001` |
| إذن صرف مخزن | `POST /api/transactions/stock-issues` | ✅ 201 — `ISS-1001` |
| سند قبض خزينة | `POST /api/transactions/treasury-vouchers` | ✅ 201 — `RCV-1002` + `JE-1015` |
| تحصيل من عميل | `POST /api/transactions/customer-collections` | ✅ 201 — `RCV-1003` + `JE-1016` |
| تسجيل حضور | `POST /api/transactions/attendance` | ✅ 201 |
| احتساب رواتب شهر | `POST /api/transactions/payrolls/generate` | ✅ 201 — 5 موظفين، صافي 82,256.68 + `JE-1017` |
| رد مبيعات | `POST /api/transactions/sales-returns` | ✅ 201 — `SRET-1001`، إرجاع للمخزن + تعديل حساب العميل |
| سداد مورد | `POST /api/transactions/supplier-payments` | ✅ 201 — `PAY-1002` + `JE-1019` |
| مطابقة المخزون | `GET /api/reports/inventory?type=stock-reconciliation` | ✅ 6 أصناف — **كلها مطابقة 100%** |
| ميزان المراجعة بعد الدورة | — | ✅ متوازن (closing 3,565,700) |
| نسخ احتياطي SQL | `GET /api/admin/backup` | ✅ 200 — تصدير كامل لكل الجداول |
| سجل التدقيق | `GET /api/admin/audit-logs` | ✅ 200 — 17 حركة مسجلة |

**الخلاصة:** كل العمليات المالية كانت تُرحَّل قيداً مزدوجاً متوازناً تلقائياً، والمخزون وأرصدة العملاء والموردين تُحدَّث لحظياً، ولا يوجد أي اختلاف في مطابقة بطاقات الأصناف.

---

## 4) بيانات الدخول

| الحساب | كلمة المرور | الصلاحية |
| --- | --- | --- |
| `admin` | `admin123` | مدير النظام (يدخل بوابة الأدمن أيضاً) |
| `accountant` | `plus123` | رئيس الحسابات — كل الوحدات |
| `sales` | `plus123` | مبيعات وعملاء |
| `store` | `plus123` | مخازن وأوامر توريد |
| `hr` | `plus123` | حضور ورواتب |
| `auditor` | `plus123` | عرض تقارير فقط |

---

## 5) ملاحظة مهمة عن حفظ البيانات

- **النسخة الحيّة (4000/3001/3002):** قاعدة البيانات ملف SQLite حقيقي داخل `plus-backend/data/plus_erp.sqlite`، وكل ما تُدخله **محفوظ فعلياً** ويعود كما هو بعد إعادة تشغيل الخادم.
- **نسخة Vercel:** نظام ملفات Serverless مؤقت، فكل ما يُدخل يعود للحالة التجريبية المتوازنة بعد فترة. للحفظ الدائم على السحابة انشر `plus-backend` على **Render** أو **Railway** (الملفان `render.yaml` و `railway.json` جاهزان) واربط الواجهتين برابط الخادم الجديد.
