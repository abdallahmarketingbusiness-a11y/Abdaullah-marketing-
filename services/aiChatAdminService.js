// src/services/aiChatAdminService.js
//
// طبقة بيانات "محادثات الذكاء الاصطناعي" من جهة السوبر أدمن: قائمة العملاء
// اللي استخدموا شات "خبير عبدالله ماركتنج"، محادثات كل عميل (مع الملخص)،
// ورسائل أي محادثة كاملة. زي clientAdminService.js بالظبط — بتبعت توكن جلسة
// الأدمن الحالية عشان مسارات app/api/admin/ai-chats/** تتأكد إنه فعلاً أدمن.

import { getCurrentSession } from "./authService";

async function authedFetch(path, body) {
  const session = await getCurrentSession();
  if (!session) throw new Error("لازم تسجّل الدخول كأدمن أولاً.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "حدث خطأ غير متوقع.");
  }
  return data;
}

// العملاء اللي عندهم محادثة واحدة على الأقل مع المساعد الذكي
export async function fetchAiChatClients() {
  const data = await authedFetch("/api/admin/ai-chats/clients");
  return data.clients || [];
}

// محادثات عميل معين (ملخص + معلومات كل محادثة، بدون الرسائل الكاملة)
export async function fetchAiChatConversations(clientId) {
  const data = await authedFetch("/api/admin/ai-chats/conversations", { clientId });
  return data.conversations || [];
}

// كل رسائل محادثة واحدة (لزرار "عرض الشات كامل")
export async function fetchAiChatMessages(conversationId) {
  const data = await authedFetch("/api/admin/ai-chats/messages", { conversationId });
  return data.messages || [];
}
