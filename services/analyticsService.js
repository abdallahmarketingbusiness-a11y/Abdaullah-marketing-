// src/services/analyticsService.js
//
// طبقة بيانات "تحليلات العملاء": الأدمن يضيف/يعدّل/يحذف تقرير شهري لكل عميل
// من لوحة السوبر أدمن (AnalyticsManager.jsx)، والعميل يقرأ تقاريره المنشورة
// بس في لوحة تحكمه (ClientDashboard.jsx → AnalyticsSection).
//
// قبل الاستخدام لازم تنفّذ sql/migration_analytics.sql في Supabase.

import { supabase } from "../lib/supabaseClient";
import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { CLIENT_ANALYTICS_TABLE, ANALYTICS_STATUS } from "../config/analyticsConfig";
import { logActivity } from "./activityLogService";
import { getCurrentClientSession } from "./clientAuthService";

// ----------------------------------------------------------------------------
// أدوات مساعدة
// ----------------------------------------------------------------------------
function normalizePayload(payload) {
  return {
    client_id: payload.client_id,
    period_month: payload.period_month, // "YYYY-MM-01"
    period_label: payload.period_label || "",
    reach: Number(payload.reach) || 0,
    impressions: Number(payload.impressions) || 0,
    engagement_rate: Number(payload.engagement_rate) || 0,
    profile_visits: Number(payload.profile_visits) || 0,
    followers_count: Number(payload.followers_count) || 0,
    followers_growth: Number(payload.followers_growth) || 0,
    best_posts: Array.isArray(payload.best_posts) ? payload.best_posts.filter((p) => p.title?.trim()) : [],
    worst_posts: Array.isArray(payload.worst_posts) ? payload.worst_posts.filter((p) => p.title?.trim()) : [],
    strengths: Array.isArray(payload.strengths) ? payload.strengths.filter(Boolean) : [],
    weaknesses: Array.isArray(payload.weaknesses) ? payload.weaknesses.filter(Boolean) : [],
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions.filter(Boolean) : [],
    status: payload.status === ANALYTICS_STATUS.DRAFT ? ANALYTICS_STATUS.DRAFT : ANALYTICS_STATUS.PUBLISHED,
  };
}

// ----------------------------------------------------------------------------
// لوحة الأدمن — إدارة تحليلات عميل معيّن
// ----------------------------------------------------------------------------

// كل تقارير عميل معيّن (بما فيها المسودات)، الأحدث أولًا
export async function fetchClientAnalyticsForAdmin(clientId) {
  const { data, error } = await supabaseAdmin
    .from(CLIENT_ANALYTICS_TABLE)
    .select("*")
    .eq("client_id", clientId)
    .order("period_month", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAnalyticsSnapshot(payload) {
  const clean = normalizePayload(payload);
  const { data, error } = await supabaseAdmin
    .from(CLIENT_ANALYTICS_TABLE)
    .insert([clean])
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "client_analytics", entityId: data.id, details: { period: data.period_label } });
  return data;
}

export async function updateAnalyticsSnapshot(id, payload) {
  const clean = normalizePayload(payload);
  const { data, error } = await supabaseAdmin
    .from(CLIENT_ANALYTICS_TABLE)
    .update(clean)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "client_analytics", entityId: id });
  return data;
}

export async function setAnalyticsStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from(CLIENT_ANALYTICS_TABLE)
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnalyticsSnapshot(id) {
  const { error } = await supabaseAdmin.from(CLIENT_ANALYTICS_TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "client_analytics", entityId: id });
  return true;
}

// ----------------------------------------------------------------------------
// لوحة العميل — قراءة التقارير المنشورة بتاعته هو بس (RLS بتفرض كده أصلًا)
// ----------------------------------------------------------------------------
export async function fetchPublishedAnalyticsForCurrentClient() {
  const session = await getCurrentClientSession();
  if (!session) return { hasData: false };

  const { data, error } = await supabase
    .from(CLIENT_ANALYTICS_TABLE)
    .select("*")
    .eq("client_id", session.user.id)
    .eq("status", ANALYTICS_STATUS.PUBLISHED)
    .order("period_month", { ascending: true });
  if (error) throw error;

  if (!data || data.length === 0) return { hasData: false };

  const latest = data[data.length - 1];
  const trend = data.map((row) => ({
    label: row.period_label || row.period_month,
    period_month: row.period_month,
    reach: row.reach,
    impressions: row.impressions,
    engagement_rate: row.engagement_rate,
    profile_visits: row.profile_visits,
    followers_count: row.followers_count,
  }));

  return {
    hasData: true,
    latest: {
      periodLabel: latest.period_label || latest.period_month,
      reach: latest.reach,
      impressions: latest.impressions,
      engagementRate: latest.engagement_rate,
      profileVisits: latest.profile_visits,
      followersCount: latest.followers_count,
      followersGrowth: latest.followers_growth,
    },
    trend,
    bestPosts: latest.best_posts || [],
    worstPosts: latest.worst_posts || [],
    strengths: latest.strengths || [],
    weaknesses: latest.weaknesses || [],
    suggestions: latest.suggestions || [],
  };
}
