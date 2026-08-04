// src/config/portfolioConfig.js
// إعدادات معرض الأعمال / الشهادات / صفحة "من نحن" — كل حاجة ممكن تتغير من غير
// ما تلمس المنطق موجودة هنا.

export const PORTFOLIO_TABLE = "portfolio_items";
export const PORTFOLIO_IMAGES_TABLE = "portfolio_images";
export const PORTFOLIO_SOURCE_FILES_TABLE = "portfolio_source_files";
export const TESTIMONIALS_TABLE = "testimonials";
export const CLIENT_REVIEWS_TABLE = "client_reviews";
export const ABOUT_TABLE = "about_page";
export const SETTINGS_TABLE = "site_settings";
export const ACTIVITY_LOG_TABLE = "activity_log";
export const DESIGN_REQUESTS_TABLE = "design_requests";
export const ANNOUNCEMENTS_TABLE = "announcements";

export const PORTFOLIO_STATUS = {
  PUBLISHED: "published",
  DRAFT: "draft",
  HIDDEN: "hidden",
};

export const TESTIMONIAL_STATUS = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
};

export const REVIEW_STATUS = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
};

export const STORAGE_BUCKETS = {
  PORTFOLIO: "portfolio",
  ABOUT: "about",
  SITE: "site",
  PORTFOLIO_SOURCES: "portfolio-sources",
  CLIENT_FILES: "client-files",
  REVIEWS: "reviews",
};

export const PORTFOLIO_GALLERY = {
  pageSize: 9,
};

// تصنيفات مقترحة (بتتبنى ديناميكيًا من البيانات الفعلية كمان، دي بس افتراضية
// أول ما تبدأ ومفيش أعمال لسه)
export const DEFAULT_CATEGORIES = [
  "سوشيال ميديا",
  "هوية بصرية",
  "مواقع",
  "إعلانات",
  "فيديو",
  "عام",
];
