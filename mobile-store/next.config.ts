import type { NextConfig } from "next";

/**
 * وضعين للبناء:
 * - الافتراضي (dev/build): تشغيل عادي بدون قيود
 * - STATIC_EXPORT=1: تصدير ثابت (GitHub Pages أو أي استضافة ملفات)
 *   مع BASE_PATH للمسار الفرعي و NEXT_PUBLIC_SITE_URL للرابط العام
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  eslint: { ignoreDuringBuilds: true },
  turbopack: {
    root: process.cwd(),
  },
  basePath: process.env.BASE_PATH || "",
  ...(isStaticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
