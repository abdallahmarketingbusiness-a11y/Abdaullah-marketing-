"use client";

import { useEffect, useRef, useState } from "react";

const GOLD = "#C9963A";
const GOLD2 = "#E8BE6A";
const GOLD3 = "#F5D78E";

const WELCOME_MESSAGE =
  "أهلاً بيك 👋 أنا مساعد عبدالله ماركتنج الذكي — خبير في التسويق الرقمي والسوشيال ميديا.\nاسألني عن أي حاجة: إعلانات ممولة، محتوى وريلز، تسويق مطاعم، استراتيجية براند... أي سؤال تسويقي هساعدك فيه بجدية 🔥";

export default function MarketingChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    requestAnimationFrame(autoResize);

    // مكان مؤقت لرد المساعد هنعبّيه تدريجيًا مع الـ streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        let msg = "حصل خطأ أثناء التواصل مع المساعد الذكي.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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
      setMessages((prev) => prev.slice(0, -1)); // شيل فقاعة الرد الفاضية
      setError(err?.message || "حصل خطأ غير متوقع، جرب تاني.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
          background: `linear-gradient(135deg, ${GOLD3}, ${GOLD})`,
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
        {open ? "✕" : <img src="/images/icons/icon-ai.png" alt="مساعد ذكي" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
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
              <img src="/images/icons/icon-ai.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#060606", fontWeight: 800, fontSize: 14 }}>
                خبير عبدالله ماركتنج
              </div>
              <div style={{ color: "#1a1400", fontSize: 11, opacity: 0.75 }}>
                مساعد ذكاء اصطناعي — تسويق رقمي وسوشيال ميديا
              </div>
            </div>
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

          {/* صندوق الكتابة */}
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
                maxHeight: 120,
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
        </div>
      )}
    </>
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
