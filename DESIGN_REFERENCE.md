# Nova Store — دليل التصميم المرجعي (Design Reference)

> **الغرض من الملف:** ده هو المرجع الرسمي لتصميم أي موقع جديد أو أي تعديل في هذا المشروع.
> أي صفحة أو موقع جديد يُبنى داخل هذا الـ repo لازم يلتزم بالهوية دي.
>
> **المراجع المعتمدة:**
> 1. **الهوية البصرية:** تصميم موقع Nova Store الحالي (app/page.tsx وصفحاته) → الأقسام 1–9
> 2. **الأنيميشن والحركة:** [Finsweet LottieFlow](https://finsweet.com/lottieflow) → القسم 10
> 3. **الأيقونات:** [Iconsax](https://app.iconsax.io/) → القسم 11
> 4. **ذكاء التصميم والجايدلاينز:** [UI/UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) → القسم 12 **(منصّب محلياً في `design-skills/`)**

---

## 1) التقنيات (Tech Stack)

| العنصر | الاختيار |
|---|---|
| الفريمورك | Next.js 15 (App Router) + TypeScript |
| الستايلينج | Tailwind CSS v4 فقط — بدون مكتبات UI خارجية |
| الخط | `Geist` عبر `next/font/google` + fallback: Arial, Helvetica, sans-serif |
| الأيقونات | **Iconsax** (المرجع رقم 3) — الإيموجي قديم ومسموح في الموجود بس الجديد كله Iconsax |

---

## 2) اللغة والاتجاه

- المحتوى **عربي** بلهجة مصرية قريبة من العميل («تشكيلة مختارة»، «هكرر الطلب»).
- الاتجاه **RTL** مع استخدام `space-x-reverse` و `ml-2` للمسافات.
- `<html lang="ar" dir="rtl">`.
- الأسعار بصيغة `EGP 599`.
- رسائل الثقة المتكررة في كل الصفحات: **شحن سريع 2–5 أيام · الدفع عند الاستلام · استرجاع خلال 14 يوماً**.

---

## 3) الألوان (Color Palette)

| الاستخدام | اللون | كلاس Tailwind |
|---|---|---|
| خلفية الصفحة الأساسية | أبيض | `bg-white` |
| خلفية الأقسام المتبادلة | رمادي فاتح جداً | `bg-gray-50` |
| العناوين | رمادي غامق | `text-gray-900` |
| النصوص الفرعية | رمادي متوسط | `text-gray-600` |
| الأزرار الرئيسية | أسود صلب | `bg-black` (hover: `bg-gray-800`) |
| الشريط العلوي والفوتر | رمادي غامق جداً | `bg-gray-900` |
| روابط الفوتر | رمادي فاتح | `text-gray-400` (hover: `text-white`) |
| شارة الخصم | أحمر | `bg-red-500` |
| النجوم/التقييم | أصفر | `text-yellow-400` |
| مكان الصور (Placeholder) | رمادي | `bg-gray-200` + نص `text-gray-400` |
| صفحة تفاصيل المنتج فقط | تدرج أزرق–بنفسجي | `bg-gradient-to-r from-blue-600 to-purple-600` |

**القاعدة:** أبيض/أسود/رمادي — تصميم نظيف minimal، واللون الوحيد الصارخ هو أحمر الخصم والأصفر للنجوم.

---

## 4) الخطوط والأحجام (Typography)

| العنصر | الحجم |
|---|---|
| H1 (عنوان الهيرو) | `text-4xl md:text-5xl lg:text-6xl font-bold leading-tight` |
| H1 (عناوين الصفحات الداخلية) | `text-3xl md:text-4xl font-bold` |
| H2 (عناوين الأقسام) | `text-3xl font-bold` (غالباً `text-center mb-2`) |
| H3 | `text-xl` أو `text-2xl font-bold` |
| النص التعريفي | `text-lg text-gray-600 mb-8` |
| نص الكروت | `text-sm` / `text-base` |

---

## 5) هيكل الصفحة والتخطيط (Layout)

- الحاوية: **`max-w-6xl mx-auto px-4`** في كل الأقسام.
- الإيقاع الرأسي: `py-12` / `py-16` / `py-24` للأقسام، مع تبادل `bg-white` و `bg-gray-50`.
- الشبكات (Grids):
  - كروت المنتجات: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
  - المميزات/الآراء: `grid-cols-1 md:grid-cols-3 gap-8`
  - الهيرو وتفاصيل المنتج: `grid-cols-1 md:grid-cols-2 gap-12 items-center`

### ترتيب أقسام الصفحة الرئيسية:
1. Hero (عنوان + وصف + زرّين + صورة placeholder)
2. شريط مميزات (3 عناصر بإيموجي)
3. الأقسام (أحذية / بنطلونات)
4. الأكثر مبيعاً (كروت منتجات)
5. الأحدث وصولاً (كروت منتجات)
6. آراء العملاء
7. الفوتر

---

## 6) المكونات (Components)

### الشريط العلوي (Top Bar)
`bg-gray-900 text-white text-sm py-2 px-4` — رسالة واحدة في النص: شحن سريع · دفع عند الاستلام · استرجاع.

### القائمة (Navigation)
- `bg-white shadow-sm sticky top-0 z-50`، ارتفاع `h-16`.
- لوجو نصي: `text-2xl font-bold text-gray-900` → «NOVA STORE».
- روابط: `text-gray-700 hover:text-gray-900 font-medium text-sm`.
- زر السلة 🛒 على اليسار، منيو همبرجر للموبايل (`md:hidden`).

### الأزرار (Buttons)
- **أساسي:** `bg-black text-white px-8 py-3 rounded font-semibold hover:bg-gray-800 transition-colors`
- **ثانوي:** `border-2 border-black text-black px-8 py-3 rounded font-semibold hover:bg-gray-100`
- **صغير (كارت منتج):** `bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800`

### كارت المنتج (Product Card) — أهم مكوّن
```
bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow
├── صورة: h-48 bg-gray-200 + شارة خصم حمراء أعلى اليمين (absolute top-2 right-2)
└── جسم الكارت: p-4
    ├── اسم: font-semibold text-gray-900
    ├── وصف: text-sm text-gray-600
    └── سطر السعر + زر «أضف للسلة»: flex justify-between items-center
        السعر: font-bold text-gray-900
```

### كارت رأي عميل (Testimonial)
`bg-gray-50 p-6 rounded-lg` + اقتباس italic + أفاتار دائري `w-10 h-10 bg-gray-300 rounded-full` + نجوم صفراء.

### الفوتر (Footer)
- `bg-gray-900 text-white py-12 px-4`
- 4 أعمدة: (البراند والوصف / تسوق / الثقة والدعم / تواصل واتساب+إيميل+سوشيال)
- روابط: `text-gray-400 text-sm hover:text-white`
- سطر الحقوق أسفل `border-t border-gray-800 pt-8 text-center text-gray-500 text-sm`

---

## 7) نبرة الكتابة (Copy Tone)

- عربي مصري مباشر وواثق، بدون مبالغة.
- جمل قصيرة الفوائد: «جودة واضحة، أسعار مباشرة، ودفع عند الاستلام».
- دايماً ذكر مزايا الثقة (COD، استرجاع، سرعة الشحن) — دي نقاط البيع الأساسية.

---

## 8) SEO والبنية

- كل صفحة بـ `Metadata` كاملة (title, description, keywords, OpenGraph, twitter).
- `JsonLd` للبيانات المنظمة، `sitemap.ts` و `robots.ts`.
- صفحات قانونية جاهزة: سياسة الخصوصية / الشحن / الاسترجاع / الشروط.
- أسماء صفحات ثابتة: `/products` مع فلترة `?category=`، `/product/[id]`.

---

## 9) قواعد ذهبية لأي موقع جديد بنفس الهوية

1. أبيض + رمادي + أسود أساساً، بدون ألوان صارخة إلا للخصم/النجوم.
2. `max-w-6xl` حاوية واحدة ثابتة، أقسام متبادلة أبيض/رمادي فاتح.
3. حواف `rounded-lg` وظل خفيف `shadow-sm` يكبر عند الهوفر `hover:shadow-md`.
4. زر أسود أساسي + زر بوردر أسود ثانوي — نفس المقاسات بالظبط.
5. `transition-colors` / `transition-shadow` على كل عنصر تفاعلي.
6. المحتوى عربي RTL بلهجة مصرية، والأسعار EGP.
7. شريط علوي رمادي غامق + نافبار أبيض لاصق + فوتر رمادي غامق بأربعة أعمدة.
8. Mobile-first: المنيو همبرغر، والجريدات تنهار لعمود واحد.

---

## 10) المرجع الثاني: Finsweet LottieFlow — مصدر الأنيميشن المعتمد

> 🔗 **الرابط:** https://finsweet.com/lottieflow
> مكتبة مجانية من Finsweet فيها **مئات ملفات Lottie** جاهزة للتحميل — دي المصدر الرسمي
> لأي حركة/أنيميشن يتضاف على المواقع اللي بنبنيها.

### إيه هو؟
- أيقونات وأنيميشن بصيغة **Lottie (JSON)** — خفيفة جداً وحجمها صغير (Lightweight).
- مجاني تماماً بعد تسجيل حساب مجاني واحد (Sign Up Fo' Free).
- مصمم أساساً لـ Webflow، بس ملفات JSON بتشتغل في **أي مكان** — بما فيها Next.js عندنا.

### طريقة الاستخدام (Workflow الرسمي بتاعهم)
1. اختار الأيقونة من التصنيفات
2. غيّر اللون (hex color) → لازم يطابق ألوان الهوية (أسود/رمادي/أحمر الخصم)
3. اختار الحركة: **ease** أو **linear**
4. حمّل ملف الـ JSON واستخدمه في الموقع

### التصنيفات المتاحة (21 تصنيف)
`404` · `Arrow` · `Attention` · `Background` · `Checkbox` · `Communication` · `Countdown` · `CTA` · `Dropdown` · `Ecommerce` · `Loading` · `Media` · `Menu Nav` · `Play` · `Radio` · `Scroll Down` · `Scrolling` · `Scroll Top` · `Search` · `Social Media` · `Success`

### إمتى نستخدمها في مواقعنا؟ (الاستخدامات المفضلة)
| الحالة في الموقع | تصنيف LottieFlow المناسب |
|---|---|
| صفحة 404 | `404` |
| نجاح الإضافة للسلة / إتمام الطلب | `Success` |
| تحميل الصفحات أو الفلاتر | `Loading` |
| أزرار CTA تفاعلية | `CTA` · `Attention` |
| فاصل بصري بين الأقسام | `Background` |
| أيقونة السكرول لأسفل في الهيرو | `Scroll Down` |
| بحث وفلترة المنتجات | `Search` |
| عناصر الكوميرس (سلة، تشيك آوت) | `Ecommerce` |

### التطبيق التقني في الـ Stack بتاعنا (Next.js)
- المكتبة: `lottie-web` (أو `@lottiefiles/dotlottie-react`) عبر npm.
- ملفات الـ JSON تتحط في `public/animations/` وتتحمل بـ fetch، أو import مباشر.
- بسبب SSR في Next.js: المكوّن يتلف بـ `next/dynamic` مع `ssr: false`.
- الأنيميشن يشتغل بـ `hover` / `in-view` / `loop` حسب السياق — مش عشوائي.

### قواعد استخدام الأنيميشن مع هويتنا
1. **الأنيميشن إضافة، مش أساس** — الهوية البصرية (أبيض/رمادي/أسود) هي الأساس دايماً.
2. ألوان أي أنيميشن لازم من палِت الهوية (أسود #000، رمادي #4B5563، أحمر #EF4444 للخصم).
3. أنيميشن واحد لكل حالة — منع التلوين البصري والزحمة.
4. الملفات لازم تفضل خفيفة (ده أصلاً سبب اختيار Lottie بدل GIF/فيديو).

> ⚠️ **ملاحظة عملية:** التحميل من موقع LottieFlow محتاج حساب مجاني مسجّل.
> لو محتاجين أنيميشن معين: يا إما المستخدم ينزّله من الموقع (مجاني) ويبعتهولي،
> يا إما أستخدم بدائل Lottie مجانية متوافقة مع الترخيص أو أبني JSON بسيط يدوياً.

---

## 11) المرجع الثالث: Iconsax — مكتبة الأيقونات المعتمدة

> 🔗 **الرابط:** https://app.iconsax.io/
> مكتبة أيقونات ضخمة (أكتر من **50,000 أيقونة**) — دي المصدر الرسمي لأي أيقونة
> تتضاف على المواقع اللي بنبنيها.

### إيه هي؟
- **50,305 أيقونة** إجمالاً: **7,140 مجانية** + 43,165 Premium (الأيقونات المجانية كفاية جداً لشغلنا).
- كل أيقونة متوفرة بـ **6 ستايلات**: `Linear` · `Outline` · `TwoTone` · `Bulk` · `Broken` · `Bold`.
- نوعين: **Static** (ثابتة) و **Animated** (متحركة) + مولّد أيقونات AI.
- شكل الزاوية: **Rounded** أو **Straight**.
- مصممة على **شبكة 24px** — متوازنة ومتناسقة مع بعضها.
- تصنيفات كتير جداً تناسب متجرنا: `shop` · `clothes` · `delivery` · `money` · `search` · `arrow` · `social` · `user` · `notifications` · `ui-design`... إلخ.

### ستايلات الأيقونات الستة
| الستايل | شكله | إمتى نستخدمه |
|---|---|---|
| **Linear** ✅ (الافتراضي عندنا) | خطوط بسيطة رفيعة | الحالة الافتراضية لكل الأيقونات |
| **Bold** | خطوط تقيلة | لما الأيقونة محتاجة تبرز (موبايل، عناصر صغيرة) |
| **Bulk** | معبأة بشفافية | عناصر ديكورية أو مميزات (features) |
| **Outline** | محيطية | زر ثانوي أو hover state |
| **TwoTone** | لونين | تظليل إضافي خفيف |
| **Broken** | خطوط مقطوعة | ستايل مميز نادراً — للهيدر/الفوتر الفخم |

### التطبيق التقني في الـ Stack بتاعنا (Next.js + React)
1. **الطريقة المفضلة:** تنزيل SVG من التطبيق وتحطيط في `app/components/icons/` كمكوّنات React — تحكم كامل وبدون dependencies زيادة.
2. **طريقة بديلة بمكتبة:** `npm i iconsax-react` — مكوّنات جاهزة بـ props:
   ```tsx
   import { Bag2 } from "iconsax-react";
   <Bag2 size={24} color="#000000" variant="Linear" />
   ```
3. الحجم الموحد: **24px** (مطابق لشبكة تصميمهم)، وللأيقونات الصغيرة 20px.

### قواعد الأيقونات مع هويتنا
1. **Rounded دايماً** — عشان تتماشى مع `rounded-lg` في هوية Nova Store (ممنوع Straight).
2. **اللون من البالِت:** أسود `#000000` أو رمادي `#4B5563`، والأحمر `#EF4444` للأخطاء/الخصم.
3. **Linear هو الافتراضي** — أي ستايل تاني لازم يكون عن قصد.
4. استبدال الإيموجي (🚚 💵 🔄 🛒) في الصفحات القديمة بأيقونات Iconsax تدريجياً عند أي تعديل عليها.
5. الأيقونة الواحدة معناها الواحد — ممنوع خلط ستايلين مختلفين في نفس السيكشن.
6. **الأنيميشن مكانها LottieFlow** (المرجع 2) — أيقونة Iconsax المتحركة متاحة بس لو مناسبة وخفيفة.

---

## 12) المرجع الرابع: UI/UX Pro Max Skill — ذكاء التصميم (منصّب محلياً)

> 🔗 **الرابط:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (131k ⭐)
> 📂 **التثبيت المحلي:** `design-skills/` جوه المشروع ده (نسخة commit `dcc40ff` من main)
> 📄 الترخيص: MIT — النسخة الأصلية والـ README في `design-skills/README-upstream.md`

### إيه هو؟
مكتبة ذكاء تصميم كاملة (AI Skill) بتوفر جايدلاينز احترافية للـ UI/UX — ودي الطبقة
اللي بتضيف **الخبرة والقواعد الاحترافية** فوق الهوية البصرية بتاعتنا.

### المحتوى القابل للبحث (عبر سكريبت Python محلي)
| البيانات | العدد |
|---|---|
| UX Guidelines (قواعد تجربة المستخدم) | **119** قاعدة |
| ستايلات تصميم searchable | **79** ستايل (50 مفعّل) |
| بالِت ألوان جاهزة للمنتجات | **192** بالِت |
| تجميعات خطوط (font pairings) | **74** تجميعة |
| أيقونات منسّقة | 105 |
| GSAP presets (أنيميشن) | 17 |
| أنواع الرسوم البيانية | 25 |
| Stacks تقنية مدعومة | 22 (منهم Next.js) |

### المهارات السبع المنصّبة في `design-skills/`
| المهارة | بتعمل إيه |
|---|---|
| **ui-ux-pro-max** ⭐ | المهارة الرئيسية — البحث في كل القواعد والستايلات والبالِتات |
| **ui-styling** | Tailwind + shadcn/ui + مكونات accessible (dialogs, forms, tables) |
| **design-system** | معمارية الـ tokens (primitive→semantic→component) ومواصفات المكونات |
| **design** | هوية العلامة، لوجو، CIP، بانرات، أيقونات، صور سوشيال |
| **brand** | نبرة البراند، الرسائل، الالتزام بالهوية |
| **slides** | عروض HTML تقديمية بـ Chart.js |
| **banner-design** | بانرات لكل المنصات بـ 13 ستايل (social/ads/web/print) |

### طريقة البحث (الأمر الأساسي)
```bash
# من جذر المشروع — python3 متاح في البيئة
python3 design-skills/ui-ux-pro-max/scripts/search.py "<استعلام>" --domain <domain>

# أمثلة:
python3 design-skills/ui-ux-pro-max/scripts/search.py "cart empty state" --domain ux
python3 design-skills/ui-ux-pro-max/scripts/search.py "ecommerce product card" --domain style
python3 design-skills/ui-ux-pro-max/scripts/search.py "next.js dark mode" --stack nextjs
```
الـ domains المتاحة: `ux` · `style` · `product` · `typography` · `color` · `icons` · `gsap` · `chart`

### قواعد الأولويات (بتاعة المهارة — بتتطبق فوق هويتنا)
| الأولوية | الفئة | أهم النقاط |
|---|---|---|
| 1 | **Accessibility** | تباين 4.5:1 · Alt text · تنقل كيبورد · aria-labels |
| 2 | **Touch & Interaction** | أزرار 44×44px على الأقل · ردود فعل للتحميل |
| 3 | **Performance** | WebP/AVIF · Lazy loading · CLS < 0.1 |
| 4 | **Style Selection** | تناسق الستايل · **أيقونات SVG مش إيموجي** ✓ (متوافق مع Iconsax) |
| 5 | **Layout & Responsive** | Mobile-first · بدون horizontal scroll |
| 6 | **Typography & Color** | أساس 16px · line-height 1.5 · semantic tokens |
| 7 | **Animation** | توقيت سياقي · الحركة بتوصف معنى · reduced-motion |
| 8 | **Forms & Feedback** | labels ظاهرة · الأخطاء جنب الحقل |
| 9 | **Navigation** | back متوقع · bottom nav ≤ 5 |
| 10 | **Charts & Data** | legends/tooltips · مش لون بس |

### إزاي ندمجها في سير الشغل (الوركفلو الرسمي)
1. **قبل بناء أي صفحة/مكوّن جديد:** بحث في المهارة عن الـ pattern المطلوب (`--domain ux` أو `--domain style`) وقراءة `design-skills/ui-ux-pro-max/references/quick-reference.md` عند الحاجة.
2. **الهوية أولاً:** لو نتيجة البحث اتعارضت مع هوية Nova Store (الأقسام 1–9) — **الهوية بتكسب**. المهارة بتضيف قواعد الجودة والـ accessibility، مش بتغير البالِت والستايل بتاعنا.
3. **مراجعة الجودة قبل التسليم:** فحص ضد قائمة الأولويات العشرة (accessibility، touch، performance...) + `design-skills/ui-ux-pro-max/references/pro-rules.md` كـ checklist نهائي.
4. **الأيقونات** من Iconsax (المرجع 3)، **الأنيميشن** من LottieFlow (المرجع 2) — والمهارة دي هي الحَكَم في قواعد الجودة.
5. ملفات المهارة محلياً في `design-skills/` ومستثناة من git (`.gitignore`) — موجودة للقراءة والبحث بس، من غير ما تتعدل.

---

## 13) الموقع الثاني: VOLT ⚡ — إكسسوارات الموبايل (2026-09)

> 📂 **المكان:** `mobile-store/` — تطبيق Next.js 15 مستقل (نفس الستاك بتاع Nova Store)
> 🎯 **الجمهور:** الشباب (جيمنج، أناقة، متانة) — بُني بمنهجية المراجع الأربعة أعلاه.

### هوية VOLT (بمواصفات المستخدم — بتتجاوز بالِت Nova Store لهذا البراند)
| العنصر | القيمة |
|---|---|
| الوضع | **Dark Mode أساسي** — OLED charcoal `#0a0a10` |
| النيون الأساسي | ليموني `#d4ff3f` |
| النيون الثانوي | موف لامع `#8b5cf6` |
| النجاح/مجاني | أخضر فوسفوري `#3dff88` |
| الخطوط | **Cairo** (عناوين) + **Tajawal** (نصوص) — self-hosted عبر Fontsource |
| الاتجاه | عربي RTL — Mobile-First بيد واحدة |

### تطبيق المراجع الأربعة في VOLT
1. **الهوية (مرجع 1):** اتباعت نفس المبادئ (نظام مكونات موحد، أزرار بحجم لمس 44px+، إيقاع أقسام، نبرة عربية شبابية) — بالِت مخصوصة للشباب بدل أبيض/أسود الهادي.
2. **LottieFlow (مرجع 2):** الأنيميشن اتعملت CSS بدائل خفيفة (marquee، floaty، pulse-glow، wheel spin) مع `prefers-reduced-motion` — لأن تحميل Lottie محتاج حساب؛ القواعد الحركية نفسها من المرجع (توقيت سياقي، الحركة بمعنى).
3. **Iconsax (مرجع 3):** كل الأيقونات inline SVG بستايل Iconsax (شبكة 24px، Rounded، Linear افتراضياً) — صفر إيموجي في الواجهة.
4. **UI/UX Pro Max (مرجع 4):** اتباعت قواعد الأولويات — تباين 4.5:1+، أهداف لمس 44px، أزرار أيقونة بـ aria-label، empty states برسالة + أكشن، أخطاء الفورم جنب الحقل، progress bar للشحن المجاني.

### مميزات مبنية (حسب المواصفات)
عجلة الحظ (خصم مقابل رقم/إيميل) · محدد طراز الهاتف (فلترة توافق) · شريط الشحن المجاني (1000 EGP) · عروض البكدجات · قسم الترند · ريلز تجريبية · تقييمات بالصور · أكمل الإكسسوار (cross-sell) · تشيك آوت صفحة واحدة + COD · تتبع الطلب (تجربة: VLT-1024) · سياسة استبدال 14 يوم.

### دروس تقنية من البناء
- **Google Fonts محجوب في بيئة البناء** → الحل: `@fontsource` packages من npm (self-hosted ومضمون).
- ملفات بنك الأعرف الغير متتبعة في git بتضيع بين الجلسات → `design-skills/` بقى tracked في git.
- حد توليد الصور 10 لكل جلسة — صوّتان (`carmount`, `stand`) هيتولدوا في رد لاحق.
