// src/config/contentConfig.js
// إعدادات دراسات الحالة / المدونة / المنشورات (بوستات وفيديوهات) —
// كل حاجة ممكن تتغير من غير ما تلمس المنطق موجودة هنا.

export const CASE_STUDIES_TABLE = "case_studies";
export const BLOG_POSTS_TABLE = "blog_posts";
export const SOCIAL_POSTS_TABLE = "social_posts";
export const SITE_POSTS_TABLE = "site_posts";

export const CONTENT_STATUS = {
  PUBLISHED: "published",
  DRAFT: "draft",
  HIDDEN: "hidden",
};

export const SOCIAL_POST_TYPE = {
  POST: "post",
  VIDEO: "video",
};

export const SOCIAL_PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube"];

// تصنيفات "منشورات الموقع" — نصائح / عروض / أخبار / إعلانات ...
export const POST_CATEGORIES = [
  { id: "tip", label: "نصيحة تسويقية", emoji: "💡" },
  { id: "offer", label: "عرض", emoji: "🎁" },
  { id: "discount", label: "خصم", emoji: "🏷️" },
  { id: "news", label: "خبر", emoji: "📰" },
  { id: "update", label: "تحديث", emoji: "🔄" },
  { id: "awareness", label: "توعية", emoji: "📢" },
  { id: "idea", label: "فكرة جديدة", emoji: "✨" },
  { id: "announcement", label: "إعلان", emoji: "📌" },
];

export function postCategoryLabel(id) {
  return POST_CATEGORIES.find((c) => c.id === id)?.label || id;
}
export function postCategoryEmoji(id) {
  return POST_CATEGORIES.find((c) => c.id === id)?.emoji || "✦";
}

export const STORAGE_BUCKET_CONTENT = "content";
