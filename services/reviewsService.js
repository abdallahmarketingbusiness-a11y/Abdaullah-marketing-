// src/services/reviewsService.js
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { CLIENT_REVIEWS_TABLE, REVIEW_STATUS, STORAGE_BUCKETS } from "../config/portfolioConfig";
import { logActivity } from "./activityLogService";

// تقييمات ظاهرة للعامة — للصفحة العامة (صفحة التقييمات + أي مكان بيعرضها في الموقع)
export async function fetchVisibleReviews({ limit } = {}) {
  let query = supabase
    .from(CLIENT_REVIEWS_TABLE)
    .select("*")
    .eq("status", REVIEW_STATUS.VISIBLE)
    .order("sort_order", { ascending: true })
    .order("review_date", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ----------------------------------------------------------------------------
// من جهة العميل (لوحة تحكم العميل) — العميل يضيف تقييمه بنفسه، وبيتحفظ
// إجباريًا بحالة "قيد المراجعة" (hidden) لحد ما الأدمن يوافق عليه ويظهره.
// بيستخدم supabase العادي (مش supabaseAdmin) عشان RLS يطبّق فعليًا.
// ----------------------------------------------------------------------------
export async function submitClientReview({ userId, clientName, companyName, rating, comment, reviewDate }) {
  if (!userId) throw new Error("لازم تسجّل الدخول الأول.");
  const payload = {
    client_user_id: userId,
    client_name: clientName,
    company_name: companyName || "",
    rating,
    comment,
    review_date: reviewDate || new Date().toISOString().slice(0, 10),
    status: REVIEW_STATUS.HIDDEN, // إجباري: قيد المراجعة لحد ما الأدمن يوافق
  };
  const { data, error } = await supabase.from(CLIENT_REVIEWS_TABLE).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

// تقييمات العميل الحالي هو بس (سواء ظاهرة أو لسه قيد المراجعة)
export async function fetchMyReviews(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from(CLIENT_REVIEWS_TABLE)
    .select("*")
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllReviewsForAdmin({ search = "" } = {}) {
  let query = supabaseAdmin.from(CLIENT_REVIEWS_TABLE).select("*");
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`client_name.ilike.%${term}%,company_name.ilike.%${term}%,comment.ilike.%${term}%`);
  }
  query = query.order("sort_order", { ascending: true }).order("review_date", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createReview(payload) {
  const { data, error } = await supabaseAdmin.from(CLIENT_REVIEWS_TABLE).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "client_reviews", entityId: data.id, details: { name: data.client_name } });
  return data;
}

export async function updateReview(id, payload) {
  const { data, error } = await supabaseAdmin
    .from(CLIENT_REVIEWS_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "client_reviews", entityId: id });
  return data;
}

export async function setReviewStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from(CLIENT_REVIEWS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReview(id) {
  const { error } = await supabaseAdmin.from(CLIENT_REVIEWS_TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "client_reviews", entityId: id });
  return true;
}

export async function reorderReviews(orderedList) {
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(CLIENT_REVIEWS_TABLE).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

export async function uploadReviewAvatar(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKETS.REVIEWS).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKETS.REVIEWS).getPublicUrl(path);
  return data.publicUrl;
}
