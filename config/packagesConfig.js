// src/config/packagesConfig.js
//
// كل القيم اللي ممكن تحتاج تتغير بدون ما تلمس منطق التطبيق موجودة هنا.

export const PACKAGES_TABLE = "packages";

export const VALIDATION = {
  nameMinLength: 3,
  nameMaxLength: 60,
  notesMaxLength: 500,
  // كلمات ممنوعة (مثال — كمّلها بما يناسبك، البحث case-insensitive وبيتجاهل التشكيل)
  bannedWords: ["كلمة1", "كلمة2", "badword1", "badword2"],
};

export const GALLERY = {
  pageSize: 9,
  sortOptions: [
    { value: "newest", label: "الأحدث" },
    { value: "oldest", label: "الأقدم" },
    { value: "price_desc", label: "الأعلى سعراً" },
    { value: "price_asc", label: "الأقل سعراً" },
  ],
};

// الباقات الأساسية الجاهزة (نفس الباقات الموجودة في قسم "الباقات" بالصفحة الرئيسية)
// بتتعرض فوق الباقات المخصصة في صفحة الجاليري.
export const BASIC_PACKAGES = [
  { id: 1, icon: "🥉", tier: "الأساسية", price: 1800, color: "#CD7F32", features: ["8 بوستات احترافية", "8 ستوري", "كتابة المحتوى التسويقي"] },
  { id: 2, icon: "🥈", tier: "المتقدمة", price: 2800, color: "#C0C0C0", features: ["12 بوست احترافي", "12 ستوري", "2 فيديو ريلز بالذكاء الاصطناعي"] },
  { id: 3, icon: "🥇", tier: "الاحترافية", price: 4500, color: "#C9963A", badge: "الأكثر طلباً", features: ["16 بوست احترافي", "20 ستوري", "4 فيديوهات ريلز + خطة محتوى شهرية"] },
  { id: 4, icon: "💎", tier: "الشاملة", price: 6500, color: "#6ee7f7", features: ["20 بوست احترافي", "30 ستوري", "إدارة كل المنصات + تقرير أداء شهري"] },
];

export const PACKAGE_STATUS = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
  FEATURED: "featured",
};
