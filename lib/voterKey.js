// lib/voterKey.js
// معرّف عشوائي ثابت لكل متصفح/جهاز — مستخدم بس عشان اللايك يتذكر إن الزائر
// ده لايك المنشور ده قبل كده، من غير الحاجة لتسجيل دخول.
const STORAGE_KEY = "am_voter_key";

export function getVoterKey() {
  if (typeof window === "undefined") return "";
  try {
    let key = window.localStorage.getItem(STORAGE_KEY);
    if (!key) {
      key = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  } catch {
    // خصوصية متصفح صارمة/حالة نادرة — رجّع مفتاح مؤقت لهذا التحميل بس
    return `temp-${Math.random().toString(36).slice(2)}`;
  }
}
