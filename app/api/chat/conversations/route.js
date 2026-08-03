// app/api/chat/conversations/route.js
//
// بيرجع قائمة محادثات العميل الحالي نفسه (مش الأدمن) — ده اللي بيستخدمه
// MarketingChatWidget.jsx عشان يعرض "محادثاتي" ويسمح للعميل يرجع لأي محادثة
// قديمة فتحها قبل كده.

import { NextResponse } from "next/server";
import { getSupabaseService } from "../../../../lib/supabaseServiceClient";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "لازم تسجّل الدخول الأول." }, { status: 401 });
    }

    const supabaseService = getSupabaseService();
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "جلسة الدخول غير صالحة." }, { status: 401 });
    }

    const { data: conversations, error } = await supabaseService
      .from("ai_chat_conversations")
      .select("id, summary, last_message_preview, last_message_at, messages_count, created_at")
      .eq("client_id", userData.user.id)
      .order("last_message_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: 500 });
  }
}
