"use client";

import { useEffect, useRef, useState } from "react";

const GOLD = "#C9963A";
const GOLD2 = "#E8BE6A";
const GOLD3 = "#F5D78E";

const WELCOME_MESSAGE =
  "أهلاً بيك 👋 أنا مساعد عبدالله ماركتنج الذكي — خبير في التسويق الرقمي والسوشيال ميديا.\nاسألني عن أي حاجة: إعلانات ممولة، محتوى وريلز، تسويق مطاعم، استراتيجية براند... أي سؤال تسويقي هساعدك فيه بجدية 🔥";

// clientSession: جلسة Supabase بتاعة العميل (زي ما بترجع من signInClient/
// signUpClient) أو null لو مسجّلش دخول. لازم العميل يكون مسجّل دخول عشان
// يستخدم الشات، لأن كل محادثة بتتحفظ مربوطة بحسابه في لوحة الأدمن.
export default function MarketingChatWidget({ clientSession, setPage }) {
  const [open, setOpen] = useState(false);
  // view: "chat" (المحادثة الحالية) أو "list" (قائمة "محادثاتي" للرجوع لمحادثة قديمة)
  const [view, setView] = useState("chat");
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const isLoggedIn = !!clientSession?.access_token;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) setHasUnread(false);
  }, [open]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    if (!isLoggedIn) return; // شبكة أمان إضافية، الزرار أصلاً بيتعطل من غير تسجيل دخول

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    requestAnimationFrame(autoResize);

    // مكان مؤقت لرد المساعد هنعبّيه تدريجيًا مع الـ streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // حماية من التعليق: لو مفيش أي بيانات جديدة جاية من السيرفر لمدة طويلة
    // (شبكة واقعة، أو الاتصال اتقطع من غير ما الـ stream يقفل بشكل نظيف)،
    // بنوقف الطلب تلقائيًا بدل ما يفضل معلّق للأبد وناخد رسالة واضحة للعميل.
    const controller = new AbortController();
    let watchdog;
    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => controller.abort(), 45000);
    };
    resetWatchdog();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientSession.access_token}`,
        },
        body: JSON.stringify({ messages: nextMessages, conversationId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let msg = "حصل خطأ أثناء التواصل مع المساعد الذكي.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
          // تفصيلة السبب الحقيقي (status/رسالة Gemini) بتتطبع في الـ console
          // بس عشان صاحب الموقع يقدر يشخّص المشكلة من غير ما تتعرض للعميل.
          if (data?.debug) console.error("Chat debug:", data.debug);
        } catch {}
        throw new Error(msg);
      }

      const returnedConversationId = res.headers.get("X-Conversation-Id");
      if (returnedConversationId) setConversationId(returnedConversationId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetWatchdog(); // وصلت بيانات جديدة → الاتصال لسه شغال، أرجّع العدّاد
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: snapshot,
          };
          return updated;
        });
      }

      if (!open) setHasUnread(true);
    } catch (err) {
      const wasAborted = err?.name === "AbortError";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        // لو اتقطع الاتصال بعد ما وصل جزء من الرد، سيبنا الجزء ده ظاهر
        // (أحسن من مسحه بالكامل) وضيفنا تنبيه، بدل ما نمسح كل حاجة.
        if (last?.role === "assistant" && last.content?.trim()) {
          return updated;
        }
        return updated.slice(0, -1); // شيل فقاعة الرد الفاضية
      });
      setError(
        wasAborted
          ? "الاتصال بالمساعد الذكي طوّل أكتر من اللازم، جرب تبعت السؤال تاني."
          : err?.message || "حصل خطأ غير متوقع، جرب تاني."
      );
    } finally {
      clearTimeout(watchdog);
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // يجيب قائمة كل محادثات العميل (من الأحدث للأقدم) — بيتنادى لما يدوس على
  // زرار "محادثاتي" في الهيدر.
  async function openConversationsList() {
    setView("list");
    setConversationsLoading(true);
    setConversationsError("");
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientSession.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذّر تحميل المحادثات.");
      setConversations(data.conversations || []);
    } catch (err) {
      setConversationsError(err?.message || "تعذّر تحميل المحادثات.");
    } finally {
      setConversationsLoading(false);
    }
  }

  // يفتح محادثة قديمة بعينها: يجيب كل رسائلها ويعرضها، ويخلي أي رسالة
  // جديدة تتبعت تكمل على نفس المحادثة دي (مش تبدأ واحدة جديدة).
  async function openConversation(conv) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clientSession.access_token}`,
        },
        body: JSON.stringify({ conversationId: conv.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذّر فتح المحادثة.");

      const loaded = (data.messages || []).map((m) => ({ role: m.role, content: m.content }));
      setMessages(loaded.length ? loaded : [{ role: "assistant", content: WELCOME_MESSAGE }]);
      setConversationId(conv.id);
      setView("chat");
    } catch (err) {
      setConversationsError(err?.message || "تعذّر فتح المحادثة.");
    } finally {
      setLoading(false);
    }
  }

  // يبدأ محادثة جديدة تمامًا (فاضية) — من غير ما يمسح محادثاته القديمة،
  // بس أي رسالة جديدة هتتحفظ في محادثة جديدة بدل ما تكمل على القديمة.
  function startNewConversation() {
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    setConversationId(null);
    setError("");
    setView("chat");
  }

  return (
    <>
      {/* الزرار العائم */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="اسأل خبير التسويق الذكي"
        aria-label="افتح شات المساعد الذكي للتسويق"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #201b12, #0c0a07)",
          boxShadow: "0 4px 24px rgba(201,150,58,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
          fontSize: 26,
          overflow: "hidden",
        }}
      >
        {open ? "✕" : <img src="/images/icons/icon-ai.png" alt="مساعد ذكي" style={{ width: "78%", height: "78%", objectFit: "contain" }} />}
        {hasUnread && !open && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#25D366",
              border: "2px solid #060606",
            }}
          />
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            zIndex: 9999,
            width: "min(370px, calc(100vw - 32px))",
            height: "min(540px, calc(100vh - 140px))",
            background: "#0a0a0a",
            border: `1px solid ${GOLD}55`,
            borderRadius: 18,
            boxShadow: "0 10px 50px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "var(--font-cairo), sans-serif",
            animation: "fadeUp 0.25s ease",
          }}
        >
          {/* الهيدر */}
          <div
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#060606",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <img src="/images/icons/icon-ai.png" alt="" style={{ width: "76%", height: "76%", objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#060606", fontWeight: 800, fontSize: 14 }}>
                خبير عبدالله ماركتنج
              </div>
              <div style={{ color: "#1a1400", fontSize: 11, opacity: 0.75 }}>
                مساعد ذكاء اصطناعي — تسويق رقمي وسوشيال ميديا
              </div>
            </div>
            {isLoggedIn && view === "chat" && (
              <button
                onClick={startNewConversation}
                title="محادثة جديدة"
                aria-label="ابدأ محادثة جديدة"
                style={{
                  background: "rgba(0,0,0,0.15)",
                  border: "none",
                  color: "#060606",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ➕
              </button>
            )}
            {isLoggedIn && (
              <button
                onClick={() => (view === "list" ? setView("chat") : openConversationsList())}
                title={view === "list" ? "رجوع للمحادثة" : "محادثاتي"}
                aria-label={view === "list" ? "رجوع للمحادثة" : "عرض محادثاتي السابقة"}
                style={{
                  background: "rgba(0,0,0,0.15)",
                  border: "none",
                  color: "#060606",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {view === "list" ? "💬" : "☰"}
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="إغلاق الشات"
              style={{
                background: "rgba(0,0,0,0.15)",
                border: "none",
                color: "#060606",
                width: 28,
                height: 28,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          {view === "list" ? (
            <ConversationsList
              conversations={conversations}
              loading={conversationsLoading}
              error={conversationsError}
              onSelect={openConversation}
              onNew={startNewConversation}
            />
          ) : (
          <>
          {/* الرسائل */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background:
                "radial-gradient(circle at 50% 0%, #111 0%, #060606 70%)",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-start" : "flex-end",
                  maxWidth: "88%",
                  background:
                    m.role === "user"
                      ? "#1a1a1a"
                      : `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)`,
                  border:
                    m.role === "user"
                      ? "1px solid #2a2a2a"
                      : `1px solid ${GOLD}44`,
                  color: "#f0f0f0",
                  padding: "10px 13px",
                  borderRadius: 14,
                  fontSize: 13.5,
                  lineHeight: 1.85,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content || (
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    <Dot delay={0} />
                    <Dot delay={0.15} />
                    <Dot delay={0.3} />
                  </span>
                )}
              </div>
            ))}
            {error && (
              <div
                style={{
                  alignSelf: "center",
                  color: "#ff8a8a",
                  fontSize: 12,
                  background: "#2a0f0f",
                  border: "1px solid #5a1f1f",
                  padding: "8px 12px",
                  borderRadius: 10,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* صندوق الكتابة — أو دعوة لتسجيل الدخول لو مفيش حساب */}
          {!isLoggedIn ? (
            <div
              style={{
                borderTop: "1px solid #1e1e1e",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                background: "#0a0a0a",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#ccc", fontSize: 12.5, lineHeight: 1.7 }}>
                لازم يكون عندك حساب عشان تستخدم المساعد الذكي 🔒
              </div>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button
                  onClick={() => {
                    setOpen(false);
                    setPage?.("login");
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid ${GOLD}66`,
                    background: "transparent",
                    color: GOLD2,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    setPage?.("signup");
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: "none",
                    background: `linear-gradient(135deg, ${GOLD3}, ${GOLD})`,
                    color: "#060606",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  إنشاء حساب
                </button>
              </div>
            </div>
          ) : (
          <div
            style={{
              borderTop: "1px solid #1e1e1e",
              padding: 10,
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "#0a0a0a",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك التسويقي هنا..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                padding: "10px 12px",
                color: "#fff",
                fontSize: 13.5,
                fontFamily: "inherit",
                outline: "none",
                maxHeight: 160,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="إرسال"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background:
                  loading || !input.trim()
                    ? "#2a2a2a"
                    : `linear-gradient(135deg, ${GOLD3}, ${GOLD})`,
                color: loading || !input.trim() ? "#666" : "#060606",
                cursor: loading || !input.trim() ? "default" : "pointer",
                fontSize: 16,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ➤
            </button>
          </div>
          )}
          </>
          )}
        </div>
      )}
    </>
  );
}

function fmtConvDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// قائمة "محادثاتي" — بتظهر لما العميل يدوس زرار ☰ في الهيدر، وتسمحله
// يرجع لأي محادثة قديمة أو يبدأ واحدة جديدة.
function ConversationsList({ conversations, loading, error, onSelect, onNew }) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "radial-gradient(circle at 50% 0%, #111 0%, #060606 70%)",
      }}
    >
      <button
        onClick={onNew}
        style={{
          padding: "10px 0",
          borderRadius: 10,
          border: `1px solid ${GOLD}66`,
          background: "transparent",
          color: GOLD2,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        ➕ محادثة جديدة
      </button>

      {loading ? (
        <p style={{ color: "#888", fontSize: 12.5, textAlign: "center", marginTop: 8 }}>جاري التحميل...</p>
      ) : error ? (
        <p style={{ color: "#ff8a8a", fontSize: 12.5, textAlign: "center", marginTop: 8 }}>{error}</p>
      ) : conversations.length === 0 ? (
        <p style={{ color: "#888", fontSize: 12.5, textAlign: "center", marginTop: 8 }}>
          مفيش محادثات سابقة لسه — ابدأ واحدة جديدة!
        </p>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            style={{
              textAlign: "right",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#141414",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#777", fontSize: 10.5 }}>{conv.messages_count || 0} رسالة</span>
              <span style={{ color: "#777", fontSize: 10.5 }}>{fmtConvDate(conv.last_message_at)}</span>
            </div>
            <div
              style={{
                color: "#f0f0f0",
                fontSize: 12.5,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {conv.summary?.trim() || conv.last_message_preview || "محادثة بدون ملخص لسه"}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function Dot({ delay }) {
  return (
    <>
      <style>{`
        @keyframes chatDotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: GOLD2,
          display: "inline-block",
          animation: `chatDotPulse 1s ${delay}s infinite ease-in-out`,
        }}
      />
    </>
  );
}
