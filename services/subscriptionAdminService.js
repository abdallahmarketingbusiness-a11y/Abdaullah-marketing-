// src/services/subscriptionAdminService.js
//
// طبقة بيانات الاشتراكات وأكواد الخصم — جهة السوبر أدمن فقط.
// إدارة كاملة لطلبات الاشتراك (تفعيل/إلغاء/انتهاء) وأكواد الخصم (إنشاء/تفعيل/تعطيل).
// المقابل لجهة العميل: services/subscriptionService.js

import { supabaseAdmin } from "../lib/supabaseAdminClient";
import { logActivity } from "./activityLogService";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// طلبات الاشتراك (package_subscriptions)
// ============================================================================

export async function fetchAllSubscriptionsForAdmin({ status = "all", search = "" } = {}) {
  let query = supabaseAdmin
    .from("package_subscriptions")
    .select("*, clients:client_id(full_name, phone, business_name)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`package_name.ilike.%${term}%,business_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// تفعيل الاشتراك: بيحدد تاريخ البداية (النهارده افتراضيًا) وتاريخ النهاية حسب مدة الباقة
export async function activateSubscription(id, { durationDays = 30, startDate } = {}) {
  const start = startDate || todayISO();
  const end = addDays(start, durationDays);

  const { data, error } = await supabaseAdmin
    .from("package_subscriptions")
    .update({
      status: "active",
      duration_days: durationDays,
      start_date: start,
      end_date: end,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "activate", entityType: "package_subscriptions", entityId: id, details: { durationDays } });
  return data;
}

export async function setSubscriptionStatus(id, status, adminNote = "") {
  const payload = { status };
  if (adminNote) payload.admin_note = adminNote;
  const { data, error } = await supabaseAdmin
    .from("package_subscriptions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update-status", entityType: "package_subscriptions", entityId: id, details: { status } });
  return data;
}

export async function deleteSubscription(id) {
  const { error } = await supabaseAdmin.from("package_subscriptions").delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "package_subscriptions", entityId: id });
  return true;
}

// تحديث جماعي: أي اشتراك "نشط" فات تاريخ نهايته يتحول لـ "منتهي"
export async function expireOverdueSubscriptions() {
  const { data, error } = await supabaseAdmin
    .from("package_subscriptions")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("end_date", todayISO())
    .select();
  if (error) throw error;
  return (data || []).length;
}

// إضافة اشتراك يدوي لعميل من لوحة السوبر أدمن مباشرة (بدون ما يمر العميل
// بخطوات الاشتراك من الموقع). بيُستخدم لما الأدمن يحب يربط عميل بباقة —
// إما باقة جاهزة (بالاسم والسعر) أو باقة مخصصة محفوظة فعلاً في كتالوج
// الباقات (packages)، بنفس فكرة "تخصيص الباقة" الموجودة في الموقع.
// لو status = "active" بيتحدد start_date/end_date تلقائيًا زي activateSubscription.
export async function createManualSubscription({
  clientId,
  packageId = null,
  packageName,
  businessName = "",
  basePrice,
  finalPrice,
  status = "active",
  durationDays = 30,
  startDate,
  adminNote = "",
}) {
  if (!clientId) throw new Error("لازم تختار عميل الأول.");
  if (!packageName || !String(packageName).trim()) throw new Error("لازم تحدد اسم الباقة.");

  const isActive = status === "active";
  const start = isActive ? (startDate || todayISO()) : null;
  const end = isActive ? addDays(start, durationDays) : null;

  const { data, error } = await supabaseAdmin
    .from("package_subscriptions")
    .insert([
      {
        client_id: clientId,
        package_id: packageId || null,
        package_name: packageName,
        business_name: businessName || "",
        base_price: Number(basePrice || 0),
        final_price: Number(finalPrice ?? basePrice ?? 0),
        status,
        duration_days: durationDays,
        start_date: start,
        end_date: end,
        admin_note: adminNote || "",
      },
    ])
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "create-manual", entityType: "package_subscriptions", entityId: data.id });
  return data;
}

// ============================================================================
// أكواد الخصم (coupons)
// ============================================================================

export async function fetchCouponsForAdmin() {
  const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCoupon({ code, discountType, discountValue, maxUses, expiresAt }) {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .insert([
      {
        code: (code || "").trim().toUpperCase(),
        discount_type: discountType === "fixed" ? "fixed" : "percent",
        discount_value: Number(discountValue || 0),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "create", entityType: "coupons", entityId: data.id });
  return data;
}

export async function updateCoupon(id, { code, discountType, discountValue, maxUses, expiresAt }) {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update({
      code: (code || "").trim().toUpperCase(),
      discount_type: discountType === "fixed" ? "fixed" : "percent",
      discount_value: Number(discountValue || 0),
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: "update", entityType: "coupons", entityId: id });
  return data;
}

// تفعيل/تعطيل كود الخصم — تحكم السوبر أدمن المباشر
export async function toggleCouponActive(id, isActive) {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity({ action: isActive ? "activate" : "deactivate", entityType: "coupons", entityId: id });
  return data;
}

export async function deleteCoupon(id) {
  const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);
  if (error) throw error;
  await logActivity({ action: "delete", entityType: "coupons", entityId: id });
  return true;
}
