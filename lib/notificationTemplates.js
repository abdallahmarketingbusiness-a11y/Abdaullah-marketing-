// lib/notificationTemplates.js
//
// نصوص إشعارات "منشور جديد" — متنوعة حسب تصنيف المنشور (config/contentConfig.js)
// عشان الإشعار يوصل للعميل بصياغة احترافية ومختلفة كل مرة مش نفس الجملة
// المكررة. بيتم اختيار جملة عشوائية من كل تصنيف في كل مرة يُنشر منشور.
//
// الاستخدام:
//   import { buildPostNotificationTitle } from "../lib/notificationTemplates";
//   buildPostNotificationTitle({ category: payload.category, title: payload.title })

const TEMPLATES = {
  tip: [
    "🚀 نصيحة تسويقية جديدة: {title}",
    "💡 نصيحة جديدة تقدر تفيد نشاطك: {title}",
    "🚀 استراتيجية تسويقية جديدة بانتظارك: {title}",
  ],
  offer: [
    "🎁 عرض جديد بانتظارك: {title}",
    "✨ عرض مميز جديد: {title}",
    "🎁 فرصة جديدة لنشاطك: {title}",
  ],
  discount: [
    "🔥 خصم جديد لفترة محدودة: {title}",
    "🏷️ خصم حصري متاح الآن: {title}",
    "🔥 عرض خصم جديد قبل ما ينتهي: {title}",
  ],
  news: [
    "📰 خبر جديد يخص نشاطك: {title}",
    "📰 آخر الأخبار: {title}",
    "🗞️ تحديث إخباري جديد: {title}",
  ],
  update: [
    "🔄 تحديث جديد على الموقع: {title}",
    "🔄 آخر تحديثات عبدالله ماركتنج: {title}",
    "🆕 تحديث جديد يهمك: {title}",
  ],
  awareness: [
    "📢 محتوى توعوي جديد: {title}",
    "📢 معلومة تسويقية تهمك: {title}",
    "📢 توعية جديدة من فريقنا: {title}",
  ],
  idea: [
    "✨ فكرة جديدة لنشاطك: {title}",
    "🎯 فكرة تسويقية جديدة: {title}",
    "✨ إلهام جديد لعملك: {title}",
  ],
  announcement: [
    "📢 إعلان جديد من عبدالله ماركتنج: {title}",
    "📌 إعلان مهم: {title}",
    "📢 إعلان جديد بانتظارك: {title}",
  ],
  default: [
    "🎯 تم نشر محتوى جديد قد يفيد نشاطك: {title}",
    "🆕 منشور جديد بانتظارك: {title}",
    "📢 محتوى جديد على عبدالله ماركتنج: {title}",
  ],
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// بيرجع نص إشعار عشوائي ومناسب لتصنيف المنشور، مع عنوان المنشور مدمج فيه.
export function buildPostNotificationTitle({ category, title } = {}) {
  const list = TEMPLATES[category] || TEMPLATES.default;
  const template = pickRandom(list);
  return template.replace("{title}", (title || "").trim());
}
