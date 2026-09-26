import type { MetadataRoute } from "next";
import { products } from "./lib/products";
import { SITE_URL } from "./lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
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
