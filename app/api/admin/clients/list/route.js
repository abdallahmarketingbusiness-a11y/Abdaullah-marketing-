import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";
import { supabaseService } from "../../../../../lib/supabaseServiceClient";

export async function POST(request) {
  try {
    await requireAdmin(request);

    // 1) كل حسابات auth.users (بريد، تاريخ إنشاء، آخر دخول، حالة الحظر...)
    //    perPage 1000 كافي لأي عدد عملاء متوسط؛ لو العدد كبر أكتر من كده
    //    محتاجين نضيف pagination هنا لاحقًا.
    const { data: usersData, error: usersError } = await supabaseService.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw usersError;

    // 2) بيانات الملف الشخصي من جدول clients
    const { data: clientRows, error: clientsError } = await supabaseService
      .from("clients")
      .select("*");
    if (clientsError) throw clientsError;

    // 3) استبعاد حسابات الأدمن من القائمة (عشان تبويب العملاء يعرض العملاء بس)
    const { data: adminRows, error: adminsError } = await supabaseService
      .from("admins")
      .select("user_id");
    if (adminsError) throw adminsError;
    const adminIds = new Set((adminRows || []).map((a) => a.user_id));

    const profileById = new Map((clientRows || []).map((c) => [c.user_id, c]));

    const now = Date.now();
    const clients = (usersData?.users || [])
      .filter((u) => !adminIds.has(u.id))
      .map((u) => {
        const profile = profileById.get(u.id) || {};
        const bannedUntil = u.banned_until ? new Date(u.banned_until).getTime() : 0;
        return {
          user_id: u.id,
          email: u.email,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          business_name: profile.business_name || "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          email_confirmed: !!u.email_confirmed_at,
          is_active: !(bannedUntil && bannedUntil > now),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ clients });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
