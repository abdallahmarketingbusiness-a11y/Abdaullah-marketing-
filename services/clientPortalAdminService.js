// src/services/clientPortalAdminService.js
//
// طبقة بيانات السوبر أدمن لكل أقسام "لوحة تحكم العميل" (الاشتراك/الأداء/
// الحملات/التقارير/الملفات/السكربتات/الملاحظات/الفواتير/الإشعارات).
// دوال عامة (Generic) بتشتغل على أي جدول من الجداول دي، بنفس فكرة
// analyticsService.js لكن بشكل قابل لإعادة الاستخدام لكل الأقسام مرة واحدة.
//
// قبل الاستخدام لازم تنفّذ sql/migration_client_portal.sql في Supabase.

import { supabase } from "../lib/supabaseClient";
import { getSectionConfig } from "../config/clientPortalConfig";
import { logActivity } from "./activityLogService";

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
  const { data, error } = await supabase
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
  const { data, error } = await supabase.from(section.table).insert([clean]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: section.table, entityId: data.id });
  return data;
}

export async function updateSectionRow(sectionKey, id, payload) {
  const section = getSectionConfig(sectionKey);
  const clean = cleanRow(sectionKey, payload);
  const { data, error } = await supabase.from(section.table).update(clean).eq("id", id).select().single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: section.table, entityId: id });
  return data;
}

export async function deleteSectionRow(sectionKey, id) {
  const section = getSectionConfig(sectionKey);
  const { error } = await supabase.from(section.table).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: section.table, entityId: id });
  return true;
}

export async function setSectionRowPublished(sectionKey, id, isPublished) {
  const section = getSectionConfig(sectionKey);
  const { data, error } = await supabase
    .from(section.table)
    .update({ is_published: isPublished })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
