// src/services/subscriptionService.js
//
// طبقة بيانات الاشتراكات — جهة العميل (اختيار باقة → اشتراك → متابعة الحالة).
// جدول package_subscriptions + coupons (sql/migration_subscriptions.sql).
// المقابل لجهة الأدمن: services/subscriptionAdminService.js

import { supabase } from "../lib/supabaseClient";
import { getCurrentClientSession } from "./clientAuthService";

const WA_NUMBER = "201069032563";

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "2-digit" });
  } catch {
    return d;
  }
}

const STATUS_LABELS = {
  pending: "قيد المراجعة",
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغي",
};

export function subscriptionStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// أيام متبقية على انتهاء الاشتراك (null لو مفيش end_date)
function daysRemaining(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  return diff;
}

function mapRow(row) {
  return {
    id: row.id,
    packageId: row.package_id,
    packageName: row.package_name,
    businessName: row.business_name,
    basePrice: Number(row.base_price || 0),
    couponCode: row.coupon_code || "",
    discountAmount: Number(row.discount_amount || 0),
    finalPrice: Number(row.final_price || 0),
    status: row.status,
    statusLabel: subscriptionStatusLabel(row.status),
    isRenewal: !!row.is_renewal,
    startDate: row.start_date,
    endDate: row.end_date,
    startDateLabel: row.start_date ? formatDate(row.start_date) : "—",
    endDateLabel: row.end_date ? formatDate(row.end_date) : "—",
    daysLeft: row.status === "active" ? daysRemaining(row.end_date) : null,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// التحقق من كود خصم (بدون استهلاكه) — بيستخدم أثناء الكتابة في خانة الكوبون
// ----------------------------------------------------------------------------
export async function checkCoupon(code) {
  const clean = (code || "").trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", clean)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

function computeDiscount(basePrice, coupon) {
  if (!coupon) return 0;
  const price = Number(basePrice || 0);
  let discount = 0;
  if (coupon.discount_type === "percent") {
    discount = (price * Number(coupon.discount_value || 0)) / 100;
  } else {
    discount = Number(coupon.discount_value || 0);
  }
  return Math.max(0, Math.min(price, Math.round(discount * 100) / 100));
}

export function calcFinalPrice(basePrice, coupon) {
  const discount = computeDiscount(basePrice, coupon);
  return { discount, finalPrice: Math.max(0, Number(basePrice || 0) - discount) };
}

// ----------------------------------------------------------------------------
// إنشاء طلب اشتراك جديد (Pending) — العميل لازم يكون مسجّل دخول
// ----------------------------------------------------------------------------
export async function createSubscriptionRequest({ pkg, couponCode }) {
  const session = await getCurrentClientSession();
  if (!session) throw new Error("لازم تسجّل الدخول الأول عشان تشترك في الباقة.");

  let coupon = null;
  if (couponCode && couponCode.trim()) {
    // redeem_coupon: دالة أتومية (SQL) بتتحقق من صلاحية الكوبون وتزوّد عداد الاستخدام خطوة واحدة
    const { data, error } = await supabase.rpc("redeem_coupon", { p_code: couponCode.trim() });
    if (error) throw error;
    if (!data) throw new Error("كود الخصم غير صالح أو منتهي الصلاحية.");
    coupon = data;
  }

  const basePrice = Number(pkg.final_price || 0);
  const { discount, finalPrice } = calcFinalPrice(basePrice, coupon);

  const { data: row, error } = await supabase
    .from("package_subscriptions")
    .insert([
      {
        client_id: session.user.id,
        package_id: pkg.id || null,
        package_name: pkg.package_name || "",
        business_name: pkg.business_name || "",
        base_price: basePrice,
        coupon_code: coupon ? coupon.code : null,
        discount_amount: discount,
        final_price: finalPrice,
        status: "pending",
      },
    ])
    .select()
    .single();
  if (error) throw error;

  return { subscription: mapRow(row), whatsappLink: buildSubscriptionWhatsAppLink(mapRow(row)) };
}

// ----------------------------------------------------------------------------
// طلب تجديد اشتراك قائم — بيعمل طلب Pending جديد مرتبط بالاشتراك الأصلي
// ----------------------------------------------------------------------------
export async function requestRenewal(subscriptionId) {
  const session = await getCurrentClientSession();
  if (!session) throw new Error("لازم تسجّل الدخول الأول.");

  const { data: original, error: fetchErr } = await supabase
    .from("package_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .eq("client_id", session.user.id)
    .single();
  if (fetchErr) throw fetchErr;

  const { data: row, error } = await supabase
    .from("package_subscriptions")
    .insert([
      {
        client_id: session.user.id,
        package_id: original.package_id,
        package_name: original.package_name,
        business_name: original.business_name,
        base_price: original.base_price,
        final_price: original.base_price,
        status: "pending",
        is_renewal: true,
        previous_subscription_id: original.id,
      },
    ])
    .select()
    .single();
  if (error) throw error;

  return { subscription: mapRow(row), whatsappLink: buildSubscriptionWhatsAppLink(mapRow(row)) };
}

// ----------------------------------------------------------------------------
// كل اشتراكات العميل الحالي
// ----------------------------------------------------------------------------
export async function fetchMySubscriptions() {
  const session = await getCurrentClientSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("package_subscriptions")
    .select("*")
    .eq("client_id", session.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

// ----------------------------------------------------------------------------
// رسالة واتساب تلقائية ببيانات الباقة/الاشتراك
// ----------------------------------------------------------------------------
export function buildSubscriptionWhatsAppLink(sub) {
  const lines = [
    "السلام عليكم.",
    sub.isRenewal ? "حابب أجدّد اشتراكي في الباقة دي:" : "حابب أشترك في الباقة دي:",
    "",
    `اسم الباقة: ${sub.packageName}`,
    sub.businessName ? `النشاط: ${sub.businessName}` : null,
    `السعر الأساسي: ${sub.basePrice.toLocaleString()} ج.م`,
    sub.couponCode ? `كود الخصم: ${sub.couponCode} (خصم ${sub.discountAmount.toLocaleString()} ج.م)` : null,
    `السعر النهائي: ${sub.finalPrice.toLocaleString()} ج.م`,
    "",
    "طلب الاشتراك اتسجل عندي بحالة (قيد المراجعة)، محتاج تأكيد وتفعيل.",
  ].filter(Boolean);
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
