// app/api/admin/ai-chats/conversations/route.js
//
// بيرجع كل محادثات عميل معين (ملخص + معلومات كل محادثة)، بدون الرسائل
// الكاملة — الرسائل الكاملة بتتجاب من مسار منفصل (ai-chats/messages) وقت
// ما الأدمن يدوس "عرض الشات كامل".

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { supabaseService } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const clientId = body?.clientId;

    if (!clientId) {
      return NextResponse.json({ error: "clientId مطلوب." }, { status: 400 });
    }

    const { data: conversations, error } = await supabaseService
      .from("ai_chat_conversations")
      .select("id, summary, last_message_preview, last_message_at, messages_count, created_at")
      .eq("client_id", clientId)
      .order("last_message_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
