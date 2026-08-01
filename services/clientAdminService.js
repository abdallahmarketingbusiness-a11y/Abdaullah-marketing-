// src/services/clientAdminService.js
//
// طبقة بيانات "إدارة العملاء" من جهة السوبر أدمن. عمليات زي إنشاء/حذف حساب،
// تغيير الإيميل، إعادة تعيين كلمة المرور، وتفعيل/إيقاف الحساب لازم تتم عن
// طريق service_role key (صلاحية كاملة على auth.users)، وده معندوش وجود في
// المتصفح أبدًا — فبنبعتها لمسارات app/api/admin/clients/** (سيرفر)، وبنبعت
// معاها توكن جلسة الأدمن الحالية عشان الـ API يتأكد إنه فعلاً أدمن.

import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { getCurrentSession } from "./authService";
import { fetchActivityLogForEntity } from "./activityLogService";

async function authedFetch(path, body) {
  const session = await getCurrentSession();
  if (!session) throw new Error("لازم تسجّل الدخول كأدمن أولاً.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "حدث خطأ غير متوقع.");
  }
  return data;
}

// جلب كل العملاء (إيميل + بيانات الملف الشخصي + حالة الحساب)
export async function fetchClientsFull() {
  const data = await authedFetch("/api/admin/clients/list");
  return data.clients || [];
}

// إضافة عميل جديد يدويًا من الأدمن
export async function createClientByAdmin({ email, password, fullName, phone, businessName }) {
  const data = await authedFetch("/api/admin/clients/create", {
    email,
    password,
    fullName,
    phone,
    businessName,
  });
  return data.client;
}

// تعديل بيانات عميل (بما فيها الإيميل)
export async function updateClientByAdmin({ userId, email, fullName, phone, businessName }) {
  const data = await authedFetch("/api/admin/clients/update", {
    userId,
    email,
    fullName,
    phone,
    businessName,
  });
  return data.client;
}

// حذف حساب عميل بالكامل (نهائي — بيمسح كل بياناته المرتبطة)
export async function deleteClientByAdmin(userId) {
  await authedFetch("/api/admin/clients/delete", { userId });
  return true;
}

// إعادة تعيين كلمة مرور العميل مباشرة
export async function resetClientPasswordByAdmin(userId, newPassword) {
  await authedFetch("/api/admin/clients/reset-password", { userId, newPassword });
  return true;
}

// تفعيل / إيقاف حساب العميل (منع تسجيل الدخول بالكامل)
export async function setClientActiveByAdmin(userId, isActive) {
  const data = await authedFetch("/api/admin/clients/set-active", { userId, isActive });
  return data.is_active;
}

// سجل نشاط عميل معيّن (العمليات اللي اتعملت على حسابه من لوحة الأدمن:
// إنشاء / تعديل / تفعيل / إيقاف / حذف / إعادة تعيين كلمة مرور)
export async function fetchClientActivityLog(userId) {
  return fetchActivityLogForEntity({ entityType: "clients", entityId: userId });
}

// تحقق سريع من الاشتراك الحالي للعميل (بيستخدم supabaseAdmin العادي لأنه
// مجرد select، مسموح بيه أصلاً لأي أدمن)
export async function fetchClientSubscriptionSummary(userId) {
  const { data, error } = await supabaseAdmin
    .from("package_subscriptions")
    .select("id, package_name, status, end_date")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
