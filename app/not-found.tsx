import Link from "next/link";
import { BoltIcon, SearchIcon } from "./components/icons";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-14 text-center">
      <span className="neon-glow grid h-20 w-20 place-items-center rounded-3xl bg-panel text-neon">
        <BoltIcon size={40} />
      </span>
      <h1 className="text-glow mt-8 font-display text-7xl font-black text-neon sm:text-8xl">404</h1>
      <h2 className="mt-3 font-display text-2xl font-black text-snow">الصفحة دي راحت فين؟</h2>
      <p className="mt-2 max-w-md text-fog">
        يمكن اللينك غلط أو الصفحة اتنقلت — بس متقلقش، كل المنتجات لسه في مكانها وسلّتك زي ما هي.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-neon">
          ارجع للرئيسية
        </Link>
        <Link href="/products" className="btn-ghost">
          <SearchIcon size={17} />
          تصفح المنتجات
        </Link>
      </div>
    </div>
  );
}
