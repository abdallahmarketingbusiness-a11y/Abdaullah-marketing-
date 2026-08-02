import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { user: admin, supabaseService } = await requireAdmin(request);
    const body = await request.json();
    const email = (body.email || "").trim();
    const password = body.password || "";
    const fullName = (body.fullName || "").trim();
    const phone = (body.phone || "").trim();
    const businessName = (body.businessName || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "الإيميل غير صالح." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور لازم تكون 6 أحرف على الأقل." }, { status: 400 });
    }

    const { data, error } = await supabaseService.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // العميل يقدر يدخل فورًا من غير تأكيد إيميل
      user_metadata: {
        full_name: fullName,
        phone,
        business_name: businessName,
      },
    });

    if (error) {
      const msg = /already.*registered|duplicate/i.test(error.message)
        ? "في حساب مسجّل بالإيميل ده بالفعل."
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // trigger handle_new_client بيعمل صف clients تلقائي، بس نضمن وجود القيم
    // في حالة الـ trigger اتأخر أو الميتاداتا متسجلتش صح
    await supabaseService
      .from("clients")
      .update({ full_name: fullName, phone, business_name: businessName })
      .eq("user_id", data.user.id);

    await supabaseService.from("activity_log").insert([
      {
        actor_email: admin.email,
        action: "create",
        entity_type: "clients",
        entity_id: data.user.id,
        details: { email, full_name: fullName },
      },
    ]);

    return NextResponse.json({
      client: {
        user_id: data.user.id,
        email,
        full_name: fullName,
        phone,
        business_name: businessName,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
