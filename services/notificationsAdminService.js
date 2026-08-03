// src/services/notificationsAdminService.js
//
// طبقة بيانات تبويب "🔔 الإشعارات" في لوحة السوبر أدمن — منفصلة عن النظام
// العام في clientPortalAdminService.js عشان تدعم حالتين مش موجودين هناك:
//   1) الإرسال الجماعي لكل العملاء دفعة واحدة (broadcast).
//   2) الجدولة (scheduled_at) — الإشعار يظهر للعميل في وقت مستقبلي محدد.
//
// كل صفوف "الإرسال الجماعي" بتتوسم بنفس broadcast_id عشان تتعدّل/تتحذف
// كمجموعة واحدة من الواجهة بدل ما الأدمن يدوّر عليها صف صف.

import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { fetchAllClientsForAdmin } from "./clientAuthService";
import { logActivity } from "./activityLogService";

const TABLE = "notifications";

function cleanPayload({ title, notifType, notifDate, scheduledAt, linkType, linkId }) {
  return {
    title: (title || "").trim(),
    notif_type: notifType || "default",
    notif_date: notifDate || new Date().toISOString().slice(0, 10),
    scheduled_at: scheduledAt || null,
    link_type: linkType || null,
    link_id: linkId || null,
    is_published: true,
  };
}

// كل الإشعارات (لكل العملاء) — للعرض في لوحة الأدمن، الأحدث أولًا
export async function fetchAllNotificationsForAdmin({ limit = 200 } = {}) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*, clients:client_id(full_name, business_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// إرسال إشعار لعميل واحد محدد
export async function sendNotificationToClient(clientId, form) {
  const payload = { ...cleanPayload(form), client_id: clientId };
  const { data, error } = await supabaseAdmin.from(TABLE).insert([payload]).select().single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: TABLE, entityId: data.id, details: { title: payload.title } });
  return data;
}

// إرسال إشعار لكل العملاء دفعة واحدة
export async function broadcastNotificationToAll(form) {
  const clients = await fetchAllClientsForAdmin();
  if (clients.length === 0) throw new Error("مفيش عملاء لسه لإرسال إشعار لهم.");

  const broadcastId = crypto.randomUUID();
  const base = cleanPayload(form);
  const rows = clients.map((c) => ({ ...base, client_id: c.user_id, broadcast_id: broadcastId }));

  const { data, error } = await supabaseAdmin.from(TABLE).insert(rows).select();
  if (error) throw error;

  await logActivity({
    action: "broadcast",
    entityType: TABLE,
    entityId: broadcastId,
    details: { title: base.title, count: rows.length },
  });

  return { broadcastId, count: data.length };
}

// تعديل إشعار لعميل واحد
export async function updateNotification(id, form) {
  const payload = cleanPayload(form);
  delete payload.is_published;
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq("id", id).select().single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: TABLE, entityId: id });
  return data;
}

// تعديل كل صفوف إرسال جماعي معيّن دفعة واحدة
export async function updateBroadcast(broadcastId, form) {
  const payload = cleanPayload(form);
  delete payload.is_published;
  const { error } = await supabaseAdmin.from(TABLE).update(payload).eq("broadcast_id", broadcastId);
  if (error) throw error;
  await logActivity({ action: "update-broadcast", entityType: TABLE, entityId: broadcastId });
  return true;
}

// حذف إشعار لعميل واحد
export async function deleteNotification(id) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: TABLE, entityId: id });
  return true;
}

// حذف كل صفوف إرسال جماعي معيّن دفعة واحدة
export async function deleteBroadcast(broadcastId) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("broadcast_id", broadcastId);
  if (error) throw error;
  await logActivity({ action: "delete-broadcast", entityType: TABLE, entityId: broadcastId });
  return true;
}
