import type { Metadata } from "next";
import "./globals.css";
import JsonLd from "./components/JsonLd";
import Navigation from "./components/Navigation";
import { CartProvider } from "./components/CartProvider";

export const metadata: Metadata = {
  title: "Nova Store | اختياراتك اليومية بأسلوبك",
  description: "أحذية وبنطلونات مختارة بعناية لتكمل إطلالتك اليومية. جودة واضحة، أسعار عادلة، وتوصيل سريع داخل مصر.",
  keywords: ["Nova Store", "أحذية", "بنطلونات", "تسوق أونلاين", "مصر"],
  authors: [{ name: "Nova Store" }],
  creator: "Nova Store",
  metadataBase: new URL("https://nova-store-tmp.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    title: "Nova Store | اختياراتك اليومية بأسلوبك",
    description: "قطع أساسية بجودة تستحقها، من Nova Store.",
    siteName: "Nova Store",
  },
  twitter: { card: "summary_large_image", title: "Nova Store", description: "اختياراتك اليومية بأسلوبك" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CartProvider>
          <Navigation />
          <JsonLd />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
