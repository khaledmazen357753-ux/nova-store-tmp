/**
 * Tailwind v4 يُعالَج عبر plugin الخاص بـ Vite (@tailwindcss/vite) في vite.config.ts.
 *
 * هذا الملف موجود فقط لمنع Vite من الصعود لمجلد المستودع الأب والتقاط
 * postcss.config.mjs الخاص بمشروع Next.js (الذي يعتمد على @tailwindcss/postcss
 * غير المثبَّت داخل هذا التطبيق)، وهو ما كان يسبب خطأ 500 في وضع التطوير.
 */
export default {
  plugins: [],
};
