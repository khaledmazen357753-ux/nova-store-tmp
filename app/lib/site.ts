/**
 * الرابط العام للموقع — أولوية الإعداد اليدوي، ثم رابط Vercel التلقائي، ثم الافتراضي
 * على Vercel: بيشتغل تلقائياً بدون أي Environment Variables
 * للنشر النهائي: اضبط NEXT_PUBLIC_SITE_URL على الدومين النهائي
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "https://voltstore.eg");
