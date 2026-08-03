// app/api/chat/messages/route.js
//
// بيرجع كل رسائل محادثة واحدة بتاعت العميل الحالي نفسه — بيستخدمه
// MarketingChatWidget.jsx لما العميل يدوس على محادثة قديمة من قائمة
// "محادثاتي" عشان يفتحها ويكمل فيها.

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

    const body = await request.json().catch(() => ({}));
    const conversationId = body?.conversationId;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId مطلوب." }, { status: 400 });
    }

    // تأكيد إن المحادثة دي فعلاً بتاعت نفس العميل (منع عميل يشوف محادثة عميل تاني)
    const { data: conv } = await supabaseService
      .from("ai_chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("client_id", userData.user.id)
      .maybeSingle();
    if (!conv) {
      return NextResponse.json({ error: "المحادثة دي مش موجودة." }, { status: 404 });
    }

    const { data: messages, error } = await supabaseService
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: 500 });
  }
}
