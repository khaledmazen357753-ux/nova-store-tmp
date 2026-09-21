"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-sm py-2 px-4">
        <div className="max-w-6xl mx-auto text-center">
          شحن سريع داخل مصر · الدفع عند الاستلام · استرجاع خلال 14 يوماً
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                NOVA STORE
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 space-x-reverse">
              <Link href="/" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                الرئيسية
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                المتجر
              </Link>
              <Link href="/products?category=shoes" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                أحذية
              </Link>
              <Link href="/products?category=pants" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                بنطلونات
              </Link>
              <Link href="/products?category=offers" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                العروض
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                من نحن
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                اتصل بنا
              </Link>
            </div>

            {/* Cart Button */}
            <div className="hidden md:flex items-center">
              <Link href="/cart" className="flex items-center text-gray-700 hover:text-gray-900 transition-colors">
                <span className="font-medium text-sm">السلة</span>
                <span className="ml-2">🛒</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-3">
                <Link href="/" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  الرئيسية
                </Link>
                <Link href="/products" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  المتجر
                </Link>
                <Link href="/products?category=shoes" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  أحذية
                </Link>
                <Link href="/products?category=pants" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  بنطلونات
                </Link>
                <Link href="/products?category=offers" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  العروض
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  من نحن
                </Link>
                <Link href="/contact" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  اتصل بنا
                </Link>
                <Link href="/cart" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">
                  السلة 🛒
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}