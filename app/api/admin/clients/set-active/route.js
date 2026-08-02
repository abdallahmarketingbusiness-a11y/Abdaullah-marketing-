import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { user: admin, supabaseService } = await requireAdmin(request);
    const body = await request.json();
    const userId = body.userId;
    const isActive = !!body.isActive;

    if (!userId) {
      return NextResponse.json({ error: "معرّف العميل مفقود." }, { status: 400 });
    }

    // "none" = إلغاء الحظر (تفعيل)، أي مدة كبيرة = حظر فعلي (إيقاف الحساب)
    // 876000h ≈ 100 سنة، يعني إيقاف دائم لحد ما الأدمن يفعّله تاني
    const { error } = await supabaseService.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (error) throw error;

    await supabaseService.from("activity_log").insert([
      {
        actor_email: admin.email,
        action: isActive ? "activate" : "deactivate",
        entity_type: "clients",
        entity_id: userId,
        details: {},
      },
    ]);

    return NextResponse.json({ success: true, is_active: isActive });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
