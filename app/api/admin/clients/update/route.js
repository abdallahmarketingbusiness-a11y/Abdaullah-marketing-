import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { user: admin, supabaseService } = await requireAdmin(request);
    const body = await request.json();
    const userId = body.userId;
    const email = (body.email || "").trim();
    const fullName = (body.fullName || "").trim();
    const phone = (body.phone || "").trim();
    const businessName = (body.businessName || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "معرّف العميل مفقود." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "الإيميل غير صالح." }, { status: 400 });
    }

    // تحديث الإيميل في auth.users لو اتغيّر
    const { data: currentUser, error: fetchErr } = await supabaseService.auth.admin.getUserById(userId);
    if (fetchErr || !currentUser?.user) {
      return NextResponse.json({ error: "العميل غير موجود." }, { status: 404 });
    }

    if (currentUser.user.email !== email) {
      const { error: updateAuthErr } = await supabaseService.auth.admin.updateUserById(userId, { email });
      if (updateAuthErr) {
        const msg = /already.*registered|duplicate/i.test(updateAuthErr.message)
          ? "في حساب تاني مسجّل بالإيميل ده بالفعل."
          : updateAuthErr.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const { data: updatedProfile, error: profileErr } = await supabaseService
      .from("clients")
      .update({ full_name: fullName, phone, business_name: businessName })
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (profileErr) throw profileErr;

    await supabaseService.from("activity_log").insert([
      {
        actor_email: admin.email,
        action: "update",
        entity_type: "clients",
        entity_id: userId,
        details: { email, full_name: fullName },
      },
    ]);

    return NextResponse.json({ client: { ...updatedProfile, email } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
