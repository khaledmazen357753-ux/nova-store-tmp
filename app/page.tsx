import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-4xl">
        <header className="text-center sm:text-left w-full">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Welcome to Nova Store
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
            Your Ultimate Online Shopping Destination | متجرك الإلكتروني المتكامل
          </p>
        </header>

        <section className="w-full">
          <h2 className="text-2xl font-semibold mb-4">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-500">Product Image</span>
              </div>
              <h3 className="font-semibold mb-2">Product Name</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Product description goes here
              </p>
              <p className="font-bold">$99.99</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-500">Product Image</span>
              </div>
              <h3 className="font-semibold mb-2">Product Name</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Product description goes here
              </p>
              <p className="font-bold">$79.99</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-500">Product Image</span>
              </div>
              <h3 className="font-semibold mb-2">Product Name</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Product description goes here
              </p>
              <p className="font-bold">$129.99</p>
            </div>
          </div>
        </section>

        <section className="w-full">
          <h2 className="text-2xl font-semibold mb-4">Why Choose Nova Store?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Fast Shipping</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Free shipping on orders over $50
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                100% secure payment processing
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Customer support available anytime
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/products"
          >
            Shop Now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="/about"
          >
            Learn More
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/about"
        >
          About Us
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/contact"
        >
          Contact
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/privacy"
        >
          Privacy Policy
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/terms"
        >
          Terms of Service
        </a>
      </footer>
    </div>
  );
}
