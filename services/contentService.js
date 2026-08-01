// src/services/contentService.js
// خدمة واحدة موحّدة لدراسات الحالة / المدونة / المنشورات — نفس المنطق مكرر
// على 3 جداول مختلفة، فبدل 3 ملفات منفصلة اتحطوا هنا مع بعض.
import { supabase } from "../lib/supabaseClient";
import {
  CASE_STUDIES_TABLE,
  BLOG_POSTS_TABLE,
  SOCIAL_POSTS_TABLE,
  CONTENT_STATUS,
  STORAGE_BUCKET_CONTENT,
} from "../config/contentConfig";
import { logActivity } from "./activityLogService";

const TABLES = {
  caseStudies: CASE_STUDIES_TABLE,
  blogPosts: BLOG_POSTS_TABLE,
  socialPosts: SOCIAL_POSTS_TABLE,
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
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAllForAdmin(entity, { search = "" } = {}) {
  let query = supabase.from(tableOf(entity)).select("*");
  if (search && search.trim()) {
    const term = search.trim();
    const searchField = entity === "caseStudies" ? "client_name" : "title";
    query = query.ilike(searchField, `%${term}%`);
  }
  query = query.order("sort_order", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createContent(entity, payload) {
  const { data, error } = await supabase.from(tableOf(entity)).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: entity, entityId: data.id });
  return data;
}

export async function updateContent(entity, id, payload) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from(tableOf(entity))
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContent(entity, id) {
  const { error } = await supabase.from(tableOf(entity)).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: entity, entityId: id });
  return true;
}

export async function reorderContent(entity, orderedList) {
  const table = tableOf(entity);
  const updates = orderedList.map(({ id, sort_order }) =>
    supabase.from(table).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

export async function uploadContentImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET_CONTENT).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET_CONTENT).getPublicUrl(path);
  return data.publicUrl;
}
