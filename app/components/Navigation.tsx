"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Nova Store
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              الرئيسية
            </Link>
            <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              المنتجات
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              من نحن
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              اتصل بنا
            </Link>
          </div>

          {/* Cart Button */}
          <div className="hidden md:flex items-center">
            <button className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              🛒
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                0
              </span>
            </button>
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
              <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                الرئيسية
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                المنتجات
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                من نحن
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                اتصل بنا
              </Link>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-fit">
                🛒 السلة (0)
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}