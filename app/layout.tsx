import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import JsonLd from "./components/JsonLd";
import Navigation from "./components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova Store - متجر إلكتروني متكامل | Online Shopping",
  description: "Nova Store is your one-stop online shop for quality products. Shop the latest trends with fast shipping and secure payments. | نوڤا ستور - متجرك الإلكتروني المتكامل للتسوق عبر الإنترنت",
  keywords: ["online shopping", "e-commerce", "Nova Store", "shopping", "products", "متجر إلكتروني", "تسوق عبر الإنترنت", "نوڤا ستور", "منتجات"],
  authors: [{ name: "Nova Store" }],
  creator: "Nova Store",
  publisher: "Nova Store",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://nova-store-tmp.vercel.app"),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "ar-EG": "/ar",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
    title: "Nova Store - Your Ultimate Online Shopping Destination",
    description: "Discover amazing products at Nova Store. Quality, convenience, and fast delivery.",
    siteName: "Nova Store",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Store - Online Shopping",
    description: "Shop the best products at Nova Store",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navigation />
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
