import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";
import { supabaseService } from "../../../../../lib/supabaseServiceClient";

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin(request);
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "معرّف العميل مفقود." }, { status: 400 });
    }

    // نجيب بيانات العميل قبل الحذف عشان نسجّلها في سجل النشاط
    const { data: profile } = await supabaseService
      .from("clients")
      .select("full_name, business_name")
      .eq("user_id", userId)
      .maybeSingle();

    // حذف حساب auth.users بيمسح صف clients تلقائيًا (on delete cascade)،
    // وده بيمسح بعده كل الاشتراكات/الملفات/التقارير/التحليلات المرتبطة بيه
    // (كلهم عندهم foreign key على clients مع on delete cascade كمان).
    const { error } = await supabaseService.auth.admin.deleteUser(userId);
    if (error) throw error;

    await supabaseService.from("activity_log").insert([
      {
        actor_email: admin.email,
        action: "delete",
        entity_type: "clients",
        entity_id: userId,
        details: { full_name: profile?.full_name || "", business_name: profile?.business_name || "" },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
