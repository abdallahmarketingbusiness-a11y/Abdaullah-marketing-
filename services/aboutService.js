// src/services/aboutService.js
import { supabase } from "../lib/supabaseClient";
import { ABOUT_TABLE, SETTINGS_TABLE, STORAGE_BUCKETS } from "../config/portfolioConfig";
import { logActivity } from "./activityLogService";

// ---------------------------------------------------------------------------
// صفحة "من نحن" — سطر واحد بيتحدث بالكامل
// ---------------------------------------------------------------------------
export async function fetchAboutPage() {
  const { data, error } = await supabase.from(ABOUT_TABLE).select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateAboutPage(payload) {
  const { data, error } = await supabase
    .from(ABOUT_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "about_page" });
  return data;
}

export async function uploadAboutImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKETS.ABOUT).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKETS.ABOUT).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// إعدادات الموقع العامة
// ---------------------------------------------------------------------------
export async function fetchSiteSettings() {
  const { data, error } = await supabase.from(SETTINGS_TABLE).select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateSiteSettings(payload) {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "site_settings" });
  return data;
}

export async function uploadSiteLogo(file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKETS.SITE).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKETS.SITE).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// إحصائيات Dashboard
// ---------------------------------------------------------------------------
export async function fetchDashboardStats() {
  const [
    { count: portfolioCount },
    { count: testimonialsCount },
    { count: requestsCount },
    { data: topViewed },
    { data: topRequested },
  ] = await Promise.all([
    supabase.from("portfolio_items").select("*", { count: "exact", head: true }),
    supabase.from("testimonials").select("*", { count: "exact", head: true }),
    supabase.from("design_requests").select("*", { count: "exact", head: true }),
    supabase.from("portfolio_items").select("id, title, views_count").order("views_count", { ascending: false }).limit(5),
    supabase.from("portfolio_items").select("id, title, requests_count").order("requests_count", { ascending: false }).limit(5),
  ]);

  return {
    portfolioCount: portfolioCount || 0,
    testimonialsCount: testimonialsCount || 0,
    requestsCount: requestsCount || 0,
    topViewed: topViewed || [],
    topRequested: topRequested || [],
  };
}
