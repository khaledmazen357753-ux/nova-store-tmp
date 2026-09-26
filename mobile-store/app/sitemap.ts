import type { MetadataRoute } from "next";
import { products } from "./lib/products";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltstore.eg";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/track`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/returns`, changeFrequency: "monthly", priority: 0.4 },
    ...products.map((p) => ({
      url: `${base}/product/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
