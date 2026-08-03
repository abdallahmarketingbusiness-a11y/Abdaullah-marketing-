// src/services/contentService.js
// خدمة واحدة موحّدة لدراسات الحالة / المدونة / المنشورات — نفس المنطق مكرر
// على 3 جداول مختلفة، فبدل 3 ملفات منفصلة اتحطوا هنا مع بعض.
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import {
  CASE_STUDIES_TABLE,
  BLOG_POSTS_TABLE,
  SOCIAL_POSTS_TABLE,
  SITE_POSTS_TABLE,
  SITE_SERVICES_TABLE,
  CONTENT_STATUS,
  STORAGE_BUCKET_CONTENT,
} from "../config/contentConfig";
import { logActivity } from "./activityLogService";

const TABLES = {
  caseStudies: CASE_STUDIES_TABLE,
  blogPosts: BLOG_POSTS_TABLE,
  socialPosts: SOCIAL_POSTS_TABLE,
  sitePosts: SITE_POSTS_TABLE,
  services: SITE_SERVICES_TABLE,
};

function tableOf(entity) {
  const table = TABLES[entity];
  if (!table) throw new Error(`نوع محتوى غير معروف: ${entity}`);
  return table;
}

export async function fetchPublished(entity, { limit } = {}) {
  let query = supabase
    .from(tableOf(entity))
    .select("*")
    .eq("status", CONTENT_STATUS.PUBLISHED);
  if (entity === "sitePosts") {
    // منشورات الموقع: الأحدث دايمًا في الأول (بعد المثبّت لو موجود)،
    // من غير الاعتماد على sort_order اليدوي القديم.
    query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  }
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAllForAdmin(entity, { search = "" } = {}) {
  let query = supabaseAdmin.from(tableOf(entity)).select("*");
  if (search && search.trim()) {
    const term = search.trim();
    const searchField = entity === "caseStudies" ? "client_name" : "title";
    query = query.ilike(searchField, `%${term}%`);
  }
  if (entity === "sitePosts") query = query.order("is_pinned", { ascending: false });
  query = query.order("sort_order", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createContent(entity, payload) {
  const { data, error } = await supabaseAdmin.from(tableOf(entity)).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: entity, entityId: data.id });
  return data;
}

export async function updateContent(entity, id, payload) {
  const { data, error } = await supabaseAdmin
    .from(tableOf(entity))
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: entity, entityId: id });
  return data;
}

export async function setContentStatus(entity, id, status) {
  const { data, error } = await supabaseAdmin
    .from(tableOf(entity))
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContent(entity, id) {
  const { error } = await supabaseAdmin.from(tableOf(entity)).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: entity, entityId: id });
  return true;
}

export async function reorderContent(entity, orderedList) {
  const table = tableOf(entity);
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(table).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

export async function uploadContentImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET_CONTENT).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET_CONTENT).getPublicUrl(path);
  return data.publicUrl;
}

// جلب منشور واحد منشور (public) — يستخدم في صفحة المنشور المستقلة
export async function fetchPublishedContentById(entity, id) {
  const { data, error } = await supabase
    .from(tableOf(entity))
    .select("*")
    .eq("id", id)
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .single();
  if (error) throw error;
  return data;
}

// منشورات مشابهة: نفس التصنيف، من غير المنشور الحالي
export async function fetchRelatedContent(entity, { category, excludeId, limit = 3 } = {}) {
  let query = supabase
    .from(tableOf(entity))
    .select("*")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .neq("id", excludeId)
    .limit(limit);
  if (category) query = query.eq("category", category);
  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// عداد المشاهدات (best-effort، مش لازم يفشل تصفح الصفحة لو حصل خطأ)
export async function incrementContentViews(entity, id) {
  try {
    if (entity === "sitePosts") {
      await supabase.rpc("increment_site_post_views", { row_id: id });
    }
  } catch {
    // تجاهل أي خطأ هنا، العداد مش حرج
  }
}
