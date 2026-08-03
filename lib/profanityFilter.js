// lib/profanityFilter.js
//
// فلتر الألفاظ الخارجة/الخادشة للحياء — بيتشيك على التعليقات قبل إرسالها،
// عربي وإنجليزي. الهدف حماية قسم التعليقات من أي كلام غير مناسب لموقع تجاري.
//
// طبقة تطبيع (normalize) بتحاول تكسر أشهر طرق "التهريب" اللي بيستخدمها
// الناس عشان يتخطوا الفلاتر: مسافات/نقط بين الحروف (ن.ي.ك)، تكرار الحروف
// (نييييك)، واختلاف صور الحروف (أ/إ/آ → ا، ة → ه، ى → ي).
//
// الاستخدام:
//   import { containsProfanity } from "../lib/profanityFilter";
//   if (containsProfanity(text)) { /* ارفض التعليق */ }

const ARABIC_TERMS = [
  "نيك", "نيكك", "منيك", "متناك", "كس", "كسم", "كسمك", "كسختك",
  "زبي", "زب", "عرص", "عرصة", "طيز", "طلعلي", "احا", "شرموط", "شرموطة",
  "قحبه", "قحبة", "لبوة", "لبوه", "خول", "منيوك", "زانية", "متناكة",
  "ابن الكلب", "بنت الكلب", "يلعن", "حيوان تربى", "قذر", "وسخ نجس",
];

const ENGLISH_TERMS = [
  "fuck", "fucking", "shit", "bitch", "cunt", "pussy", "dick", "asshole",
  "whore", "slut", "bastard", "nigger", "nigga", "porn", "sex video",
];

function normalizeArabic(input) {
  return input
    .toLowerCase()
    // يوحّد صور الحروف المتقاربة
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // يشيل التطويل (ـــ) والتشكيل
    .replace(/[\u0640\u064B-\u0652]/g, "")
    // يشيل أي فاصل بين الحروف (نقط/مسافات/شرط تحت) اللي بيتحط للتهريب
    .replace(/[\s._\-*]+/g, "")
    // يقلل الحروف المكررة لحرف واحد (نييييك → نيك)
    .replace(/(.)\1{1,}/g, "$1");
}

function normalizeEnglish(input) {
  return input
    .toLowerCase()
    .replace(/[\s._\-*]+/g, "")
    .replace(/(.)\1{1,}/g, "$1")
    // يستبدل أرقام بديلة شائعة بحروفها (l33t speak: f4ck → fack)
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/7/g, "t");
}

export function containsProfanity(text) {
  if (!text || typeof text !== "string") return false;

  const normalizedAr = normalizeArabic(text);
  const normalizedEn = normalizeEnglish(text);

  const hitArabic = ARABIC_TERMS.some((term) => normalizedAr.includes(normalizeArabic(term)));
  const hitEnglish = ENGLISH_TERMS.some((term) => normalizedEn.includes(normalizeEnglish(term)));

  return hitArabic || hitEnglish;
}
