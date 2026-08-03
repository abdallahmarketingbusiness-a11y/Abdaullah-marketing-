// app/api/admin/ai-chats/clients/route.js
//
// بيرجع قائمة العملاء اللي عندهم محادثة واحدة على الأقل مع "خبير عبدالله
// ماركتنج" الذكي، مع عدد محادثاتهم وتاريخ آخر رسالة، عشان تبويب "محادثات
// الذكاء الاصطناعي" في الأدمن يعرضهم كقائمة أولى (زي قائمة العملاء العادية).

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/adminApiAuth";

export async function POST(request) {
  try {
    const { supabaseService } = await requireAdmin(request);

    // 1) كل المحادثات (بيانات خفيفة بس) عشان نجمعها حسب العميل
    const { data: conversations, error: convError } = await supabaseService
      .from("ai_chat_conversations")
      .select("id, client_id, last_message_at, messages_count")
      .order("last_message_at", { ascending: false });
    if (convError) throw convError;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // 2) بيانات العملاء (auth.users + clients profile) لأصحاب المحادثات دول بس
    const clientIds = [...new Set(conversations.map((c) => c.client_id))];

    const { data: usersData, error: usersError } = await supabaseService.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const { data: clientRows, error: clientsError } = await supabaseService
      .from("clients")
      .select("user_id, full_name, phone, business_name");
    if (clientsError) throw clientsError;

    const profileById = new Map((clientRows || []).map((c) => [c.user_id, c]));
    const userById = new Map((usersData?.users || []).map((u) => [u.id, u]));

    // 3) تجميع لكل عميل: عدد المحادثات + تاريخ آخر رسالة
    const grouped = new Map();
    for (const conv of conversations) {
      if (!clientIds.includes(conv.client_id)) continue;
      const existing = grouped.get(conv.client_id);
      if (!existing) {
        grouped.set(conv.client_id, {
          conversations_count: 1,
          last_message_at: conv.last_message_at,
        });
      } else {
        existing.conversations_count += 1;
        if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
          existing.last_message_at = conv.last_message_at;
        }
      }
    }

    const clients = clientIds
      .filter((id) => userById.has(id)) // استبعاد أي client_id يتحذف حسابه لاحقًا
      .map((id) => {
        const user = userById.get(id);
        const profile = profileById.get(id) || {};
        const stats = grouped.get(id);
        return {
          user_id: id,
          email: user.email,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          business_name: profile.business_name || "",
          conversations_count: stats?.conversations_count || 0,
          last_message_at: stats?.last_message_at || null,
        };
      })
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    return NextResponse.json({ clients });
  } catch (err) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع." }, { status: err.status || 500 });
  }
}
