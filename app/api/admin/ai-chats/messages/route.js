// app/api/admin/ai-chats/messages/route.js
//
// بيرجع كل رسائل محادثة واحدة بالترتيب — ده اللي بيتنادى لما الأدمن يدوس
// "عرض الشات كامل" على أي محادثة في القائمة.

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { supabaseService } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const conversationId = body?.conversationId;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId مطلوب." }, { status: 400 });
    }

    const { data: messages, error } = await supabaseService
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
