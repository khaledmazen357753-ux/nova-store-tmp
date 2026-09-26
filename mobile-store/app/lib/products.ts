export type CategoryKey = "protection" | "power" | "gaming" | "audio" | "mounts";

export type Product = {
  id: number;
  name: string;
  desc: string;
  price: number;
  oldPrice?: number;
  category: CategoryKey;
  img?: string;
  rating: number;
  reviews: number;
  trending?: boolean;
  compat: "all" | string[];
  colors?: string[];
  features: string[];
  lookWith?: number[];
};

export const categories: { key: CategoryKey; name: string; desc: string }[] = [
  { key: "protection", name: "الحماية والدروع", desc: "جرابات مضادة للصدمات وحمايات شاشة سيراميك وزجاج مقوى ضد الكسر" },
  { key: "power", name: "عالم الطاقة والسرعة", desc: "شواحن GaN جدارية سريعة وباور بانك وكابلات مضفرة نايلون" },
  { key: "gaming", name: "عالم الجيمنج", desc: "Triggers ومراوح تبريد تلغي السخونة وتمنع اللاج" },
  { key: "audio", name: "الصوت والفايبس", desc: "سماعات TWS عصرية وسبيكرات بلوتوث مقاومة للمية والتراب" },
  { key: "mounts", name: "حوامل وتثبيت", desc: "حوامل سيارات مغناطيسية وحوامل مكتبية للبث والتصوير" },
];

export const deviceBrands: Record<string, string[]> = {
  iPhone: [
    "iPhone 16 Pro Max",
    "iPhone 16",
    "iPhone 15 Pro Max",
    "iPhone 15",
    "iPhone 14",
    "iPhone 13",
    "iPhone 12",
    "iPhone 11",
  ],
  Samsung: ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S23", "Galaxy A55", "Galaxy A35", "Galaxy A25"],
  Xiaomi: ["Redmi Note 13 Pro", "Redmi Note 13", "POCO X6 Pro", "POCO M6", "Xiaomi 14"],
  Oppo: ["Reno 11", "Reno 10", "A78", "A58"],
};

const iModels = [
  "iPhone 16 Pro Max",
  "iPhone 16",
  "iPhone 15 Pro Max",
  "iPhone 15",
  "iPhone 14",
  "iPhone 13",
  "iPhone 12",
  "iPhone 11",
];
const sModels = ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S23", "Galaxy A55", "Galaxy A35"];

export const products: Product[] = [
  {
    id: 1,
    name: "جراب Armor-X المضاد للصدمات",
    desc: "درع عسكري بزوايا Airbag يمتص أي صدمة",
    price: 299,
    oldPrice: 399,
    category: "protection",
    img: "/products/case.jpg",
    rating: 4.8,
    reviews: 1240,
    trending: true,
    compat: [...iModels.slice(2), ...sModels.slice(0, 3)],
    colors: ["#0a0a10", "#d4ff3f", "#8b5cf6"],
    features: [
      "زوايا Airbag تمتص الصدمات من أي ارتفاع",
      "خامة TPU + بولي كربونيت مقواة ضد الخدش",
      "حواف مرتفعة تحمي الكاميرا والشاشة",
      "مخصص للشحن اللاسلكي بدون تعطيل",
    ],
    lookWith: [2, 6],
  },
  {
    id: 2,
    name: "اسكرينة سيراميك 9H",
    desc: "زجاج مقوى ضد الكسر والبصمات بأدوات تركيب كاملة",
    price: 149,
    oldPrice: 199,
    category: "protection",
    img: "/products/screen.jpg",
    rating: 4.7,
    reviews: 2130,
    trending: true,
    compat: [...iModels, ...sModels],
    features: [
      "صلابة 9H — مقاومة للكسر والخدش",
      "طبقة أوليوفوبيك — البصمات بتمسح لوحدها",
      "شفافية 99.9% من غير تأثير على حساسية اللمس",
      "أدوات تركيب كاملة + ملصق إزالة الغبار",
    ],
    lookWith: [1],
  },
  {
    id: 3,
    name: "جراب Majestic الشفاف",
    desc: "ضد الاصفرار — شفافية بتفضل زي أول يوم",
    price: 199,
    category: "protection",
    rating: 4.6,
    reviews: 860,
    compat: [...iModels, ...sModels],
    features: [
      "تقنية ضد الاصفرار لمدة سنة كاملة",
      "شفافية HD تظهر لون الموبايل الأصلي",
      "حواف ناعمة سهلة التركيب والفك",
      "دعم الشحن اللاسلكي والماجنتيك",
    ],
    lookWith: [2, 6],
  },
  {
    id: 4,
    name: "شاحن GaNPro 45W",
    desc: "تقنية GaN — حجم أصغر وشحن أسرع 3 أضعاف",
    price: 549,
    oldPrice: 699,
    category: "power",
    img: "/products/charger.jpg",
    rating: 4.9,
    reviews: 1875,
    trending: true,
    compat: "all",
    features: [
      "شحن 50% في 20 دقيقة لأجهزة PD",
      "GaN — حرارة أقل وحجم نص الشاحن العادي",
      "بروتوكولات PD + QC + Samsung Super Fast",
      "حماية 8 مستويات ضد التوصيل الزائد",
    ],
    lookWith: [6],
  },
  {
    id: 5,
    name: "باور بانك VoltBank 20000",
    desc: "شاشة رقمية وشحن جهازين في نفس الوقت",
    price: 899,
    oldPrice: 1099,
    category: "power",
    img: "/products/powerbank.jpg",
    rating: 4.8,
    reviews: 2140,
    compat: "all",
    features: [
      "شحن سريع 22.5W للبنك وللجهاز",
      "شاشة LED بتعرض نسبة الشحن بالظبط",
      "منفذين USB + Type-C يدعم In/Out",
      "بيشحن موبايلك 4-5 مرات كاملة",
    ],
    lookWith: [4],
  },
  {
    id: 6,
    name: "كابل Titan المضفر 100W",
    desc: "نايلون مضفر بيتحمل 25 ألف لفة وشحن 100W",
    price: 149,
    category: "power",
    img: "/products/cable.jpg",
    rating: 4.7,
    reviews: 3320,
    compat: "all",
    features: [
      "شحن 100W ونقل بيانات سريع",
      "نايلون مضفر ضد القطع والتشابك",
      "رؤوس معدنية مقواة ضد الانفصال",
      "طول 1.5 متر — ينفع للسفر والشغل",
    ],
    lookWith: [4],
  },
  {
    id: 7,
    name: "Trigger FSM V2 للجيمنج",
    desc: "أزرار حساسة كإحساس النقر — اكسب في PUBG و COD",
    price: 349,
    oldPrice: 449,
    category: "gaming",
    img: "/products/trigger.jpg",
    rating: 4.6,
    reviews: 980,
    trending: true,
    compat: "all",
    features: [
      "استجابة فورية بدون أي تأخير",
      "يتثبت فوق الجراب عادي بدون فك",
      "خامة زينك ألاي — ثابت ومش بيبتلع",
      "ينفع لكل ألعاب الـ FPS",
    ],
    lookWith: [8],
  },
  {
    id: 8,
    name: "مروحة تبريد MagCool",
    desc: "تبريد ماجنتيك بينزل الحرارة 12° ويمنع اللاج",
    price: 279,
    category: "gaming",
    img: "/products/cooler.jpg",
    rating: 4.5,
    reviews: 640,
    compat: "all",
    features: [
      "بتنزل حرارة الموبايل 12 درجة فعلياً",
      "تصميم ماجنتيك يتثبت في ثانية",
      "مفيش صوت مزعج أثناء اللعب",
      "منفذ USB-C مستقل للتشغيل",
    ],
    lookWith: [7],
  },
  {
    id: 9,
    name: "سماعة BassPods Pro TWS",
    desc: "بيس يقصف وANC يعتزل أي ضوضاء",
    price: 799,
    oldPrice: 999,
    category: "audio",
    img: "/products/earbuds.jpg",
    rating: 4.8,
    reviews: 5410,
    trending: true,
    compat: "all",
    colors: ["#0a0a10", "#f4f4f8", "#d4ff3f"],
    features: [
      "ANC هجين — عزل ضوضاء 35dB",
      "بطارية 36 ساعة مع الكيس",
      "بلوتوث 5.3 — اتصال زي الزيت",
      "مقاومة رشاش المية IPX5",
    ],
    lookWith: [5],
  },
  {
    id: 10,
    name: "سبيكر BoomBox IPX7",
    desc: "مقاوم للمية والتراب — صوت 360 للرحلات والقعدات",
    price: 999,
    oldPrice: 1199,
    category: "audio",
    img: "/products/speaker.jpg",
    rating: 4.7,
    reviews: 1290,
    compat: "all",
    features: [
      "مقاومة مية وتراب IPX7 — ينفع البحر والپول",
      "صوت 360 درجة ببيس واضح",
      "بطارية 24 ساعة تشغيل متواصل",
      "ربط سبيكرين مع بعض لصوت ستيريو",
    ],
  },
  {
    id: 11,
    name: "حامل سيارة MagGrip",
    desc: "تثبيت مغناطيسي قوي — بجك وخرج بجك",
    price: 249,
    category: "mounts",
    img: "/products/carmount.jpg",
    rating: 4.6,
    reviews: 720,
    compat: "all",
    features: [
      "مغناطيس N52 — الموبايل مش بيقع على المطبات",
      "دوران 360 للرؤية الأفقية والرأسية",
      "يتثبت على فتحة التكييف أو الداشبورد",
      "ينفع مع كل الموبايلات بالشرائط المرفقة",
    ],
  },
  {
    id: 12,
    name: "حامل مكتبي StreamArm",
    desc: "ذراع مرن للبث والتصوير بأي زاوية تحبها",
    price: 399,
    oldPrice: 499,
    category: "mounts",
    img: "/products/stand.jpg",
    rating: 4.7,
    reviews: 450,
    trending: true,
    compat: "all",
    features: [
      "ذراع مرن بيتثبت في أي زاوية",
      "قاعدة تثبيت قوية على المكتب",
      "يتحمل موبايلات لحد 7 بوصة",
      "مثالي للبث المباشر والتصوير",
    ],
    lookWith: [14],
  },
  {
    id: 13,
    name: "جراب RGB Gamer Flex",
    desc: "إضاءة RGB متزامنة — إحساس جيمنج كامل",
    price: 329,
    category: "protection",
    rating: 4.4,
    reviews: 310,
    compat: [...iModels.slice(2), ...sModels.slice(0, 3)],
    features: [
      "إضاءة RGB متزامنة مع اللعب",
      "حماية كاملة ضد الصدمات",
      "بطارية مدمجة خفيفة تدوم طويل",
      "زر تشغيل/إيقاف للإضاءة",
    ],
    lookWith: [7, 8],
  },
  {
    id: 14,
    name: "رينج لايت Neon للتصوير",
    desc: "إضاءة نيون للكونتنت — فيديوهاتك بمستوى تاني",
    price: 359,
    category: "mounts",
    rating: 4.5,
    reviews: 280,
    trending: true,
    compat: "all",
    features: [
      "3 مستويات إضاءة + 6 درجات حرارة لون",
      "بطارية شحن داخلي تدوم 4 ساعات",
      "حامل موبايل مدمج + ريموت تصوير",
      "حجم صغير ينفع الجيب والسفر",
    ],
    lookWith: [12],
  },
];

export const bundles: { id: string; name: string; desc: string; items: number[]; price: number }[] = [
  {
    id: "b1",
    name: "بكج الحماية المتكاملة",
    desc: "جراب Armor-X + اسكرينة سيراميك + كابل مضفر — درع كامل لموبايلك",
    items: [1, 2, 6],
    price: 499,
  },
  {
    id: "b2",
    name: "بكج الجيمر المحترف",
    desc: "Trigger FSM + مروحة تبريد MagCool + جراب مضاد للصدمات",
    items: [7, 8, 1],
    price: 749,
  },
  {
    id: "b3",
    name: "بكج الطاقة السريعة",
    desc: "شاحن GaNPro 45W + كابل Titan 100W + باور بانك 20000",
    items: [4, 6, 5],
    price: 1399,
  },
];

export const getProduct = (id: number) => products.find((p) => p.id === id);

export const isCompatible = (p: Product, device: string | null) =>
  !device || p.compat === "all" || p.compat.includes(device);
