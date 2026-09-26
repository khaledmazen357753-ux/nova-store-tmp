import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./globals.css";
import { StoreProvider } from "./lib/store";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import SpinWheel from "./components/SpinWheel";
import JsonLd from "./components/JsonLd";
import { SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VOLT | إكسسوارات موبايل — حماية، طاقة، صوت",
    template: "%s | VOLT",
  },
  description:
    "جهّز موبايلك لأقصى أداء.. حماية، أناقة، وسرعة بلا حدود! إكسسوارات موبايل للشباب: جرابات مضادة للصدمات، شواحن GaN سريعة، إكسسوارات جيمنج، سماعات TWS وحوامل. دفع عند الاستلام واستبدال فوري خلال 14 يوماً.",
  keywords: [
    "إكسسوارات موبايل",
    "جرابات موبايل",
    "اسكرينة",
    "شاحن سريع",
    "باور بانك",
    "إكسسوارات جيمنج",
    "سماعات بلوتوث",
    "VOLT",
    "فولت",
  ],
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "VOLT",
    title: "VOLT | جهّز موبايلك لأقصى أداء",
    description: "حماية، أناقة، وسرعة بلا حدود — إكسسوارات موبايل للشباب. دفع عند الاستلام واستبدال فوري.",
    url: SITE_URL,
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

/** بيانات منظمة للمتجر (Schema.org) — تساعد جوجل في فهم وعرض الموقع */
const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "VOLT",
  alternateName: "فولت — إكسسوارات موبايل",
  description:
    "متجر إكسسوارات الموبايل للشباب — حمايات وشواحن سريعة وإكسسوارات جيمنج وصوتيات وحوامل. دفع عند الاستلام واستبدال خلال 14 يوماً.",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  image: `${SITE_URL}/products/hero.jpg`,
  inLanguage: "ar",
  areaServed: "EG",
  currenciesAccepted: "EGP",
  paymentAccepted: "Cash on Delivery, Credit Card",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+20-100-000-0000",
    email: "hello@voltstore.eg",
    availableLanguage: ["ar", "en"],
  },
  sameAs: ["https://instagram.com", "https://tiktok.com"],
};

export const viewport: Viewport = {
  themeColor: "#0a0a10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-ink font-sans text-snow antialiased">
        <StoreProvider>
          <JsonLd data={storeJsonLd} />
          <div className="flex min-h-screen flex-col pb-16 md:pb-0">
            <Navigation />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <SpinWheel />
        </StoreProvider>
      </body>
    </html>
  );
}
