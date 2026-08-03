// src/services/clientPortalService.js
//
// طبقة بيانات لوحة تحكم العميل — بيانات حقيقية بالكامل من Supabase.
// كل دالة هنا بتقرأ من جدول حقيقي (شوف sql/migration_client_portal.sql) وترجع
// بس الصفوف "المنشورة" (is_published = true) الخاصة بالعميل الحالي — نفس
// الشكل بالظبط اللي كانت بترجعه البيانات التجريبية القديمة، عشان
// components/ClientDashboard.jsx يفضل شغال من غير أي تعديل في العرض.
//
// الإضافة/التعديل/الحذف بيتم من لوحة السوبر أدمن (تبويب "بيانات لوحة العميل")
// عن طريق services/clientPortalAdminService.js.

import { supabase } from "../lib/supabaseClient";
import { getCurrentClientSession } from "./clientAuthService";
import { fetchPublishedAnalyticsForCurrentClient } from "./analyticsService";
import { subscriptionStatusLabel } from "./subscriptionService";

function money(n) {
  return `${Number(n || 0).toLocaleString("en-US")} ج.م`;
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "2-digit" });
  } catch {
    return d;
  }
}

async function currentClientId() {
  const session = await getCurrentClientSession();
  return session?.user?.id || null;
}

async function fetchPublished(table, orderField, { ascending = false, limit = null } = {}) {
  const clientId = await currentClientId();
  if (!clientId) return [];
  let query = supabase
    .from(table)
    .select("*")
    .eq("client_id", clientId)
    .eq("is_published", true)
    .order(orderField, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ----------------------------------------------------------------------------
// آخر اشتراك حقيقي للعميل الحالي — من package_subscriptions (نفس الجدول اللي
// بيدير منه السوبر أدمن تبويب "الاشتراكات")، مش من جدول منفصل. بنفضّل عرض
// اشتراك "نشط" لو موجود، ولو مفيش نعرض آخر واحد "قيد المراجعة"، وإلا آخر صف.
// ----------------------------------------------------------------------------
async function fetchLatestSubscriptionForCurrentClient() {
  const clientId = await currentClientId();
  if (!clientId) return null;
  const { data, error } = await supabase
    .from("package_subscriptions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  return rows.find((r) => r.status === "active") || rows.find((r) => r.status === "pending") || rows[0] || null;
}

// ----------------------------------------------------------------------------
// الرئيسية — ملخص مبني من عدة جداول حقيقية + آخر تقرير تحليلات
// ----------------------------------------------------------------------------
export async function getHomeSummary() {
  const [sub, lastReports, lastCampaigns, lastNotes, analytics, activeCampaigns] = await Promise.all([
    fetchLatestSubscriptionForCurrentClient(),
    fetchPublished("reports", "report_date", { limit: 1 }),
    fetchPublished("campaigns", "created_at", { limit: 1 }),
    fetchPublished("client_notes", "note_date", { limit: 1 }),
    fetchPublishedAnalyticsForCurrentClient(),
    fetchPublished("campaigns", "created_at"),
  ]);

  const report = lastReports[0];
  const campaign = lastCampaigns[0];
  const note = lastNotes[0];
  const bestPost = analytics?.hasData ? analytics.bestPosts?.[0] : null;

  return {
    subscription: sub
      ? {
          planName: sub.package_name || "—",
          status: subscriptionStatusLabel(sub.status),
          renewsAt: sub.end_date ? formatDate(sub.end_date) : sub.status === "pending" ? "قيد المراجعة" : "غير محدد",
          daysLeft: sub.status === "active" && sub.end_date ? Math.max(0, Math.ceil((new Date(sub.end_date) - new Date()) / 86400000)) : null,
        }
      : { planName: "لا يوجد اشتراك مفعّل بعد", status: "—", renewsAt: "—", daysLeft: null },
    lastReport: report
      ? { title: report.title, date: formatDate(report.report_date), note: (report.summary || "").slice(0, 90) }
      : { title: "لا توجد تقارير بعد", date: "", note: "" },
    lastCampaign: campaign
      ? { name: campaign.name, platform: campaign.platform, status: campaign.status, spend: money(campaign.spend) }
      : { name: "لا توجد حملات بعد", platform: "", status: "—", spend: "—" },
    lastPost: bestPost
      ? { title: bestPost.title, platform: bestPost.platform, date: analytics.latest.periodLabel, engagement: bestPost.metric }
      : { title: "لا توجد بيانات منشورات بعد", platform: "", date: "", engagement: "" },
    lastUpdate: note
      ? { text: note.text_content, date: formatDate(note.note_date) }
      : { text: "لا توجد تحديثات بعد", date: "" },
    performanceSummary: analytics?.hasData
      ? {
          reach: analytics.latest.reach,
          engagementRate: analytics.latest.engagementRate,
          followersGrowth: analytics.latest.followersGrowth ?? 0,
          activeCampaigns: activeCampaigns.filter((c) => (c.status || "").startsWith("نشط")).length,
        }
      : { reach: 0, engagementRate: 0, followersGrowth: 0, activeCampaigns: activeCampaigns.length },
  };
}

// ----------------------------------------------------------------------------
// التحليلات — جدول حقيقي: client_analytics (sql/migration_analytics.sql)
// بيتم إدخالها من لوحة السوبر أدمن (تبويب "تحليلات العملاء") وتظهر هنا للعميل
// اللي التقارير منشورة (status = published) بتاعته بس.
// ----------------------------------------------------------------------------
export async function getAnalytics() {
  return fetchPublishedAnalyticsForCurrentClient();
}

// ----------------------------------------------------------------------------
// الأداء — جدول حقيقي: performance_kpis
// ----------------------------------------------------------------------------
export async function getPerformance() {
  const clientId = await currentClientId();
  if (!clientId) return { kpis: [] };
  const { data, error } = await supabase
    .from("performance_kpis")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return {
    kpis: (data || []).map((k) => ({ label: k.label, value: Number(k.value), target: Number(k.target) || 100, unit: k.unit || "" })),
  };
}

// ----------------------------------------------------------------------------
// الحملات الإعلانية — جدول حقيقي: campaigns
// ----------------------------------------------------------------------------
export async function getCampaigns() {
  const rows = await fetchPublished("campaigns", "created_at");
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    status: c.status,
    budget: money(c.budget),
    spend: money(c.spend),
    reach: Number(c.reach || 0).toLocaleString("en-US"),
    impressions: Number(c.impressions || 0).toLocaleString("en-US"),
    ctr: `${Number(c.ctr || 0).toFixed(2)}%`,
    cpc: money(c.cpc),
    leads: Number(c.leads || 0).toLocaleString("en-US"),
    roi: `${Number(c.roi || 0).toFixed(1)}%`,
    roiRaw: Number(c.roi || 0),
    notes: c.notes || "",
  }));
}

// ----------------------------------------------------------------------------
// التقارير — جدول حقيقي: reports
// ----------------------------------------------------------------------------
export async function getReports() {
  const rows = await fetchPublished("reports", "report_date");
  return rows.map((r) => ({ id: r.id, title: r.title, date: formatDate(r.report_date), summary: r.summary }));
}

// ----------------------------------------------------------------------------
// الملفات — جدول حقيقي: client_files
// ----------------------------------------------------------------------------
export async function getFiles() {
  const rows = await fetchPublished("client_files", "file_date");
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.file_type,
    size: f.size_label,
    date: formatDate(f.file_date),
    url: f.file_url,
  }));
}

// ----------------------------------------------------------------------------
// تحميل حقيقي لملف من قسم "الملفات" (Blob) بدل فتح تاب جديد بس — بتفرض على
// المتصفح ينزّل الملف باسمه الصحيح حتى لو الرابط من مصدر خارجي (Cross-Origin)،
// طول ما الرابط بيسمح بالقراءة (buckets الـ public في Supabase بتسمح بيها).
// لو حصل خطأ (مثلاً رابط خارجي مقفول CORS) بنرجع false عشان الواجهة تعمل
// fallback بفتح الرابط في تاب جديد.
// ----------------------------------------------------------------------------
export async function downloadClientFile(url, fileName) {
  if (!url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// السكربتات — جدول حقيقي: content_scripts
// ----------------------------------------------------------------------------
export async function getScripts() {
  const rows = await fetchPublished("content_scripts", "created_at");
  return rows.map((s) => ({ id: s.id, title: s.title, platform: s.platform, status: s.status, excerpt: s.excerpt }));
}

// ----------------------------------------------------------------------------
// الملاحظات — جدول حقيقي: client_notes
// ----------------------------------------------------------------------------
export async function getNotes() {
  const rows = await fetchPublished("client_notes", "note_date");
  return rows.map((n) => ({ id: n.id, author: n.author, date: formatDate(n.note_date), text: n.text_content }));
}

// ----------------------------------------------------------------------------
// الفواتير — جدول حقيقي: invoices
// ----------------------------------------------------------------------------
export async function getInvoices() {
  const rows = await fetchPublished("invoices", "invoice_date");
  return rows.map((i) => ({ id: i.id, number: i.invoice_number, date: formatDate(i.invoice_date), amount: money(i.amount), status: i.status }));
}

// ----------------------------------------------------------------------------
// الإشعارات — جدول حقيقي: notifications
// ----------------------------------------------------------------------------
function mapNotificationRow(n) {
  return {
    id: n.id,
    title: n.title,
    date: formatDate(n.notif_date || n.created_at),
    type: n.notif_type,
    read: n.is_read,
    linkType: n.link_type || null,
    linkId: n.link_id || null,
  };
}

export async function getNotifications() {
  const rows = await fetchPublished("notifications", "created_at");
  return rows.map(mapNotificationRow);
}

// تعليم إشعار واحد كمقروء (العميل يقدر يحدّث إشعاراته هو بس — شوف
// sql/patch_notifications_realtime_and_read.sql)
export async function markNotificationRead(id) {
  const clientId = await currentClientId();
  if (!clientId) return false;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) throw error;
  return true;
}

// تعليم كل إشعارات العميل الحالي كمقروءة دفعة واحدة
export async function markAllNotificationsRead() {
  const clientId = await currentClientId();
  if (!clientId) return false;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("client_id", clientId)
    .eq("is_read", false);
  if (error) throw error;
  return true;
}

// اشتراك Realtime — بيوصل فورًا أي إشعار جديد يخص العميل الحالي (لحظة ما
// الأدمن ينشره)، من غير الحاجة لعمل refresh للصفحة. بيرجع دالة "unsubscribe".
// محتاج تفعيل Realtime على الجدول أولًا (موجود في نفس ملف الـ SQL بالأعلى).
export function subscribeToClientNotifications(clientId, onInsert) {
  if (!clientId) return () => {};
  const channel = supabase
    .channel(`notifications-${clientId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `client_id=eq.${clientId}` },
      (payload) => {
        if (payload?.new?.is_published) onInsert(mapNotificationRow(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
