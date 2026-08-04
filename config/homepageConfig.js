// config/homepageConfig.js
export const HOMEPAGE_SECTIONS_TABLE = "homepage_sections";

// نفس الـ bucket المستخدم أصلاً لصور "about"/site — إعادة استخدام بدل عمل bucket جديد
export const HOMEPAGE_STORAGE_BUCKET = "site";

// أنواع الأقسام الجديدة (custom) اللي ممكن الأدمن يضيفها في أي مكان بالصفحة
export const CUSTOM_SECTION_TYPES = {
  banner: { label: "بانر", icon: "🖼️" },
  offer: { label: "عرض", icon: "🎁" },
  discount: { label: "خصم", icon: "🏷️" },
  ad: { label: "إعلان", icon: "📣" },
  text: { label: "قسم نصي", icon: "📝" },
};

// أسماء عرض للأقسام الأساسية (core) الموجودة في كود الموقع — بيبانو بس
// مش قابلين للحذف، بس قابلين للإخفاء/الترتيب/تعديل النصوص والصور والأزرار.
export const CORE_SECTION_LABELS = {
  hero: "الصفحة الرئيسية (Hero)",
  "posts-feed": "أحدث المنشورات",
  services: "خدماتنا",
  "case-study": "دراسة الحالة المميزة",
  portfolio: "أعمالي الحقيقية",
  tips: "نصائح للمشاريع",
  pricing: "الباقات والأسعار",
  why: "ليه تختارنا",
  testimonials: "آراء العملاء",
  process: "آلية العمل",
};
