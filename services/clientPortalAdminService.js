// src/services/clientPortalAdminService.js
//
// طبقة بيانات السوبر أدمن لكل أقسام "لوحة تحكم العميل" (الاشتراك/الأداء/
// الحملات/التقارير/الملفات/السكربتات/الملاحظات/الفواتير/الإشعارات).
// دوال عامة (Generic) بتشتغل على أي جدول من الجداول دي، بنفس فكرة
// analyticsService.js لكن بشكل قابل لإعادة الاستخدام لكل الأقسام مرة واحدة.
//
// قبل الاستخدام لازم تنفّذ sql/migration_client_portal.sql في Supabase.

import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { getSectionConfig } from "../config/clientPortalConfig";
import { STORAGE_BUCKETS } from "../config/portfolioConfig";
import { logActivity } from "./activityLogService";

// ----------------------------------------------------------------------------
// رفع ملف حقيقي لقسم "الملفات" إلى Supabase Storage (bucket: client-files)
// بيرجع { url, sizeLabel, guessedType } جاهزين للحفظ في صف client_files.
// ----------------------------------------------------------------------------
function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// أنواع ملفات التصميم الشائعة (فوتوشوب/إليستريتور/إنديزاين/سكتش/فيجما/زيروكس...)
const DESIGN_EXTENSIONS = ["psd", "ai", "eps", "indd", "sketch", "fig", "xd", "cdr", "afdesign", "afphoto"];

function guessFileType(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "webm", "avi", "mkv", "m4v"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"].includes(ext)) return "image";
  if (DESIGN_EXTENSIONS.includes(ext)) return "design";
  if (["xlsx", "xls", "csv"].includes(ext)) return "sheet";
  return "default";
}

// قائمة الامتدادات المسموحة لواجهة اختيار الملف (input[type=file] accept)
export const CLIENT_FILE_ACCEPT = [
  ".pdf",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".heic",
  ".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v",
  ...DESIGN_EXTENSIONS.map((e) => `.${e}`),
  ".xlsx", ".xls", ".csv",
].join(",");

// حد أمان قبل الرفع (300MB) — لو الباقة الحالية في Supabase عندها حد أصغر
// هيرجع خطأ من السيرفر برسالة واضحة تحت.
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

export async function uploadClientFile(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `الملف كبير جدًا (${formatBytes(file.size)}). الحد الأقصى المسموح به ${formatBytes(MAX_UPLOAD_BYTES)}. ` +
      `لو الملف أكبر من كدا، ارفعه على Google Drive وحط رابط المشاركة في حقل "رابط التحميل" تحت.`
    );
  }
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKETS.CLIENT_FILES).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    if (/payload too large|exceeded the maximum allowed size|maximum size/i.test(error.message || "")) {
      throw new Error(
        "الملف كبير جدًا على مساحة التخزين الحالية في Supabase. جرّب ملف أصغر، أو ارفعه على Google Drive " +
        'وحط رابط المشاركة في حقل "رابط التحميل" تحت.'
      );
    }
    throw error;
  }
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKETS.CLIENT_FILES).getPublicUrl(path);
  return { url: data.publicUrl, sizeLabel: formatBytes(file.size), guessedType: guessFileType(file.name) };
}

function cleanRow(sectionKey, payload) {
  const section = getSectionConfig(sectionKey);
  if (!section) throw new Error(`قسم غير معروف: ${sectionKey}`);
  const clean = {};
  section.fields.forEach((f) => {
    const raw = payload[f.key];
    if (f.type === "number") clean[f.key] = raw === "" || raw === undefined || raw === null ? 0 : Number(raw);
    else if (f.type === "checkbox") clean[f.key] = !!raw;
    else if (f.type === "date") clean[f.key] = raw || null;
    else clean[f.key] = raw ?? "";
  });
  return clean;
}

// كل صفوف عميل معيّن (بما فيها غير المنشورة)، الأحدث أولًا
export async function fetchSectionRowsForAdmin(sectionKey, clientId) {
  const section = getSectionConfig(sectionKey);
  if (!section) throw new Error(`قسم غير معروف: ${sectionKey}`);
  const { data, error } = await supabaseAdmin
    .from(section.table)
    .select("*")
    .eq("client_id", clientId)
    .order(section.dateField, { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSectionRow(sectionKey, clientId, payload) {
  const section = getSectionConfig(sectionKey);
  const clean = { ...cleanRow(sectionKey, payload), client_id: clientId };
  const { data, error } = await supabaseAdmin.from(section.table).insert([clean]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: section.table, entityId: data.id });
  return data;
}

export async function updateSectionRow(sectionKey, id, payload) {
  const section = getSectionConfig(sectionKey);
  const clean = cleanRow(sectionKey, payload);
  const { data, error } = await supabaseAdmin.from(section.table).update(clean).eq("id", id).select().single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: section.table, entityId: id });
  return data;
}

export async function deleteSectionRow(sectionKey, id) {
  const section = getSectionConfig(sectionKey);
  const { error } = await supabaseAdmin.from(section.table).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: section.table, entityId: id });
  return true;
}

export async function setSectionRowPublished(sectionKey, id, isPublished) {
  const section = getSectionConfig(sectionKey);
  const { data, error } = await supabaseAdmin
    .from(section.table)
    .update({ is_published: isPublished })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
