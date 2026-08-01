// src/config/analyticsConfig.js
// إعدادات نظام "تحليلات العملاء" — الجدول، الحالات، والقيم الافتراضية.

export const CLIENT_ANALYTICS_TABLE = "client_analytics";

export const ANALYTICS_STATUS = {
  PUBLISHED: "published", // ظاهر في لوحة العميل
  DRAFT: "draft", // لسه بيتحضّر، مش ظاهر للعميل
};

// أسماء الشهور بالعربي — تُستخدم لتوليد period_label تلقائيًا من period_month
export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function monthKeyToLabel(monthStr) {
  // monthStr بصيغة "YYYY-MM-DD" أو "YYYY-MM"
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-");
  const idx = Number(m) - 1;
  const name = ARABIC_MONTHS[idx] || "";
  return name ? `${name} ${y}` : monthStr;
}

// عناصر فارغة تُستخدم كقالب أساسي عند إنشاء تقرير جديد
export function emptyPostItem() {
  return { title: "", platform: "", metric: "" };
}

export const METRIC_DEFS = [
  { key: "reach", label: "الوصول", icon: "👁️", color: "#C9963A" },
  { key: "engagement_rate", label: "نسبة التفاعل", icon: "💬", color: "#E8BE6A", suffix: "%" },
  { key: "followers_count", label: "عدد المتابعين", icon: "👥", color: "#F5D78E" },
  { key: "profile_visits", label: "زيارات الحساب", icon: "🌐", color: "#8ec9ff" },
];
