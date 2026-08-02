// lib/adminApiAuth.js
//
// دالة مشتركة تستخدمها كل مسارات app/api/admin/** عشان تتأكد إن الطلب راجع
// فعلاً من أدمن مسجّل دخول (مش أي حد عنده حساب عادي بيحاول ينادي الـ API).
//
// طريقة العمل: الواجهة (browser) بتبعت Authorization: Bearer <access_token>
// بتاع جلسة الأدمن (supabaseAdminClient). هنا بنتحقق من التوكن ده عن طريق
// service_role client، وبعدين بنتأكد إن الـ user_id موجود في جدول admins.
//
// السيرفر بس — ممنوع استيراده في أي Client Component.

import { getSupabaseService } from "./supabaseServiceClient";

// بيرجع { user } لو التحقق نجح، أو بيرمي Error برسالة مناسبة لو فشل
export async function requireAdmin(request) {
  const supabaseService = getSupabaseService();
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    const err = new Error("لازم تسجّل الدخول كأدمن.");
    err.status = 401;
    throw err;
  }

  const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
  if (userError || !userData?.user) {
    const err = new Error("جلسة الدخول غير صالحة، سجّل الدخول تاني.");
    err.status = 401;
    throw err;
  }

  const { data: adminRow, error: adminError } = await supabaseService
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    const err = new Error("مفيش صلاحية أدمن على الحساب ده.");
    err.status = 403;
    throw err;
  }

  return { user: userData.user, supabaseService };
}
