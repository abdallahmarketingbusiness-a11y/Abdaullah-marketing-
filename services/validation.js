// src/services/validation.js
import { VALIDATION } from "../config/packagesConfig";

// إزالة أي HTML/سكريبت من النص (حماية من XSS)
// ملاحظة: React أصلاً بيعمل escape تلقائي لأي نص بيتعرض بـ {},
// لكن التنظيف هنا بيمنع تخزين أكواد ضارة في قاعدة البيانات من الأساس.
export function sanitizeText(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// Supabase/PostgREST بيستخدم parameterized queries أصلاً فمفيش SQL injection حقيقي،
// لكن بنمنع رموز التحكم اللي ملهاش داعي تتخزن كنص عادي.
function stripControlChars(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

export function cleanInput(value) {
  return stripControlChars(sanitizeText(value));
}

function normalizeArabic(str) {
  return str
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, ""); // إزالة التشكيل
}

export function containsBannedWord(text) {
  if (!text) return false;
  const normalized = normalizeArabic(text);
  return VALIDATION.bannedWords.some((w) => normalized.includes(normalizeArabic(w)));
}

// يتحقق من اسم النشاط / اسم الباقة
export function validateName(value, label = "الاسم") {
  const clean = cleanInput(value);
  if (!clean) return { valid: false, error: `${label} مطلوب.` };
  if (clean.length < VALIDATION.nameMinLength)
    return { valid: false, error: `${label} لازم يكون ${VALIDATION.nameMinLength} أحرف على الأقل.` };
  if (clean.length > VALIDATION.nameMaxLength)
    return { valid: false, error: `${label} أطول من الحد المسموح (${VALIDATION.nameMaxLength} حرف).` };
  if (containsBannedWord(clean))
    return { valid: false, error: `${label} يحتوي على كلمات غير لائقة.` };
  return { valid: true, value: clean };
}

export function validateNotes(value) {
  const clean = cleanInput(value || "");
  if (clean.length > VALIDATION.notesMaxLength)
    return { valid: false, error: `الملاحظات أطول من الحد المسموح (${VALIDATION.notesMaxLength} حرف).` };
  if (containsBannedWord(clean))
    return { valid: false, error: "الملاحظات تحتوي على كلمات غير لائقة." };
  return { valid: true, value: clean };
}

// يتحقق من الباقة كاملة قبل الحفظ، ويرجع أول خطأ يلاقيه
export function validatePackagePayload(payload) {
  const businessName = validateName(payload.business_name, "اسم النشاط");
  if (!businessName.valid) return businessName;

  const packageName = validateName(payload.package_name, "اسم الباقة");
  if (!packageName.valid) return packageName;

  const notes = validateNotes(payload.client_notes);
  if (!notes.valid) return notes;

  if (!payload.business_type || !cleanInput(payload.business_type))
    return { valid: false, error: "نوع النشاط مطلوب." };

  return {
    valid: true,
    value: {
      ...payload,
      business_name: businessName.value,
      package_name: packageName.value,
      business_type: cleanInput(payload.business_type),
      client_notes: notes.value,
    },
  };
}
