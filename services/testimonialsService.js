// src/services/testimonialsService.js
import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { TESTIMONIALS_TABLE, TESTIMONIAL_STATUS, STORAGE_BUCKETS } from "../config/portfolioConfig";
import { logActivity } from "./activityLogService";

export async function fetchVisibleTestimonials() {
  const { data, error } = await supabase
    .from(TESTIMONIALS_TABLE)
    .select("*")
    .eq("status", TESTIMONIAL_STATUS.VISIBLE)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchAllTestimonialsForAdmin({ search = "" } = {}) {
  let query = supabaseAdmin.from(TESTIMONIALS_TABLE).select("*");
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`certificate_name.ilike.%${term}%,issuer.ilike.%${term}%`);
  }
  query = query.order("sort_order", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTestimonial(payload) {
  const { data, error } = await supabaseAdmin.from(TESTIMONIALS_TABLE).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "testimonials", entityId: data.id, details: { name: data.certificate_name } });
  return data;
}

export async function updateTestimonial(id, payload) {
  const { data, error } = await supabaseAdmin
    .from(TESTIMONIALS_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "testimonials", entityId: id });
  return data;
}

export async function setTestimonialStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from(TESTIMONIALS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTestimonial(id) {
  const { error } = await supabaseAdmin.from(TESTIMONIALS_TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "testimonials", entityId: id });
  return true;
}

export async function reorderTestimonials(orderedList) {
  const updates = orderedList.map(({ id, sort_order }) =>
    supabaseAdmin.from(TESTIMONIALS_TABLE).update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return true;
}

export async function uploadTestimonialImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKETS.ABOUT).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKETS.ABOUT).getPublicUrl(path);
  return data.publicUrl;
}
