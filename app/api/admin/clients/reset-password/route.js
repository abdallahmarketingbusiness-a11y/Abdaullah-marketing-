import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { user: admin, supabaseService } = await requireAdmin(request);
    const body = await request.json();
    const userId = body.userId;
    const newPassword = body.newPassword || "";

    if (!userId) {
      return NextResponse.json({ error: "معرّف العميل مفقود." }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل." }, { status: 400 });
    }

    const { error } = await supabaseService.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;

    await supabaseService.from("activity_log").insert([
      {
        actor_email: admin.email,
        action: "reset-password",
        entity_type: "clients",
        entity_id: userId,
        details: {},
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
