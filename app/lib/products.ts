export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: "shoes" | "pants";
  categoryLabel: string;
  image: string;
  badge?: string;
  sizes?: string[];
};

export const products: Product[] = [
  {
    id: 1,
    name: "Nova Air",
    description: "سنيكرز جلد ناعم للراحة اليومية",
    price: 599,
    oldPrice: 715,
    category: "shoes",
    categoryLabel: "أحذية",
    image: "/product-sneaker.png",
    badge: "الأكثر مبيعاً",
    sizes: ["40", "41", "42", "43", "44"],
  },
  {
    id: 2,
    name: "Heritage Loafer",
    description: "حذاء لوفر جلد بلمسة كلاسيكية",
    price: 799,
    oldPrice: 999,
    category: "shoes",
    categoryLabel: "أحذية",
    image: "/product-loafer.png",
    badge: "خصم 20%",
    sizes: ["40", "41", "42", "43"],
  },
  {
    id: 3,
    name: "Denim 01",
    description: "جينز إنديغو بقصة Slim مريحة",
    price: 499,
    category: "pants",
    categoryLabel: "بنطلونات",
    image: "/product-jeans.png",
    badge: "جديد",
    sizes: ["30", "32", "34", "36"],
  },
  {
    id: 4,
    name: "Run Lite",
    description: "خفة ومرونة لكل خطوة في يومك",
    price: 699,
    category: "shoes",
    categoryLabel: "أحذية",
    image: "/product-sneaker.png",
    sizes: ["40", "41", "42", "43", "44"],
  },
  {
    id: 5,
    name: "Chino Sand",
    description: "بنطلون شينو بلون رملي متعدد الإطلالات",
    price: 549,
    oldPrice: 649,
    category: "pants",
    categoryLabel: "بنطلونات",
    image: "/product-jeans.png",
    badge: "خصم 15%",
    sizes: ["30", "32", "34", "36"],
  },
  {
    id: 6,
    name: "Oxford 02",
    description: "أناقة رسمية بخامة جلد متينة",
    price: 999,
    category: "shoes",
    categoryLabel: "أحذية",
    image: "/product-loafer.png",
    sizes: ["40", "41", "42", "43"],
  },
  {
    id: 7,
    name: "City Cargo",
    description: "كارجو عملي بتفاصيل عصرية",
    price: 579,
    category: "pants",
    categoryLabel: "بنطلونات",
    image: "/product-jeans.png",
    badge: "جديد",
    sizes: ["30", "32", "34", "36"],
  },
  {
    id: 8,
    name: "Weekend Court",
    description: "سنيكرز يومي بخطوط نظيفة",
    price: 629,
    category: "shoes",
    categoryLabel: "أحذية",
    image: "/product-sneaker.png",
    sizes: ["40", "41", "42", "43", "44"],
  },
];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("ar-EG").format(price);
}
