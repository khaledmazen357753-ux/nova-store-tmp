import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsGrid from "./ProductsGrid";

export const metadata: Metadata = {
  title: "المنتجات",
  description:
    "تصفح كل إكسسوارات الموبايل — حمايات، شواحن سريعة، جيمنج، صوتيات وحوامل. فلتر حسب موبايلك.",
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-fog">
          جاري التحميل...
        </div>
      }
    >
      <ProductsGrid />
    </Suspense>
  );
}
