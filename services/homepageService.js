// src/services/homepageService.js
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { HOMEPAGE_SECTIONS_TABLE, HOMEPAGE_STORAGE_BUCKET } from "../config/homepageConfig";
import { logActivity } from "./activityLogService";

// عرض الموقع (Public) — الأقسام الظاهرة بس، مرتّبة
export async function fetchHomepageSections() {
  const { data, error } = await supabase
    .from(HOMEPAGE_SECTIONS_TABLE)
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// لوحة الأدمن — كل الأقسام (ظاهرة ومخفية)
export async function fetchAllHomepageSections() {
  const { data, error } = await supabaseAdmin
    .from(HOMEPAGE_SECTIONS_TABLE)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// إضافة قسم جديد (custom بس — الأقسام الأساسية متزرعة مسبقًا بالـ migration)
export async function createHomepageSection({ custom_type, content = {}, sort_order }) {
  const section_key = `custom-${crypto.randomUUID()}`;
  const { data, error } = await supabaseAdmin
    .from(HOMEPAGE_SECTIONS_TABLE)
    .insert([{ section_key, kind: "custom", custom_type, content, sort_order, is_visible: true }])
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "homepage_section", entityId: data.id });
  return data;
}

// تعديل محتوى قسم (نص/صورة/أزرار/عناصر) — بيشتغل مع core و custom
export async function updateHomepageSectionContent(id, content) {
  const { data, error } = await supabaseAdmin
    .from(HOMEPAGE_SECTIONS_TABLE)
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "homepage_section", entityId: id });
  return data;
}

// إظهار / إخفاء قسم
export async function setHomepageSectionVisibility(id, is_visible) {
  const { data, error } = await supabaseAdmin
    .from(HOMEPAGE_SECTIONS_TABLE)
    .update({ is_visible, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// حذف قسم — مسموح للأقسام الـ custom بس (بيتأكد الأدمن UI من ده قبل النداء)
export async function deleteHomepageSection(id) {
  const { error } = await supabaseAdmin.from(HOMEPAGE_SECTIONS_TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "homepage_section", entityId: id });
  return true;
}

// ترتيب الأقسام بالسحب والإفلات — بتاخد قائمة [{id, sort_order}]
export async function reorderHomepageSections(orderedList) {
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(HOMEPAGE_SECTIONS_TABLE).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

export async function uploadHomepageImage(file) {
  const ext = file.name.split(".").pop();
  const path = `homepage/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(HOMEPAGE_STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(HOMEPAGE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
