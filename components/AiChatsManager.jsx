// src/components/AiChatsManager.jsx
//
// تبويب "🤖 محادثات الذكاء الاصطناعي" في لوحة السوبر أدمن:
// قائمة العملاء اللي استخدموا شات "خبير عبدالله ماركتنج" → دوس على عميل
// تشوف كل محادثاته (كل واحدة بملخصها) → دوس "عرض الشات كامل" تشوف كل
// الرسائل زي ما حصلت بالظبط.

import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchAiChatClients,
  fetchAiChatConversations,
  fetchAiChatMessages,
} from "../services/aiChatAdminService";

const fieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 13,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function BackBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "none",
        color: "#ccc",
        fontSize: 12.5,
        cursor: "pointer",
        fontFamily: FONT,
        marginBottom: 14,
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, width = 560 }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: width, maxHeight: "88vh", overflowY: "auto",
          background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 16 }}>{title}</h3>
            {subtitle && <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// مودال "عرض الشات كامل" — بيجيب رسائل المحادثة أول ما يتفتح
function FullChatModal({ conversation, client, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAiChatMessages(conversation.id);
        setMessages(data);
      } catch (e) {
        setError(e.message || "تعذّر تحميل رسائل المحادثة.");
      } finally {
        setLoading(false);
      }
    })();
  }, [conversation.id]);

  return (
    <Modal
      title={`💬 المحادثة كاملة`}
      subtitle={`${client.full_name || client.email} — ${fmtDate(conversation.last_message_at)}`}
      onClose={onClose}
      width={600}
    >
      {loading ? (
        <p style={{ color: "#888", fontSize: 13 }}>جاري التحميل...</p>
      ) : error ? (
        <p style={{ color: "#ff8080", fontSize: 13 }}>{error}</p>
      ) : messages.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>مفيش رسائل في المحادثة دي.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-start" : "flex-end",
                maxWidth: "88%",
                background:
                  m.role === "user" ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)`,
                border: m.role === "user" ? "1px solid rgba(255,255,255,0.1)" : `1px solid ${GOLD}44`,
                color: "#f0f0f0",
                padding: "10px 13px",
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <div style={{ fontSize: 10.5, color: m.role === "user" ? "#aaa" : GOLD3, fontWeight: 800, marginBottom: 4 }}>
                {m.role === "user" ? "العميل" : "المساعد الذكي"} · {fmtDate(m.created_at)}
              </div>
              {m.content}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// شاشة "محادثات عميل معين" — قائمة كل محادثاته بملخصها
function ClientConversationsView({ client, onBack }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullChat, setFullChat] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAiChatConversations(client.user_id);
        setConversations(data);
      } catch (e) {
        setError(e.message || "تعذّر تحميل المحادثات.");
      } finally {
        setLoading(false);
      }
    })();
  }, [client.user_id]);

  return (
    <div dir="rtl">
      <BackBtn onClick={onBack}>→ رجوع لقائمة العملاء</BackBtn>

      <div style={{ marginBottom: 18 }}>
        <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{client.full_name || "—"}</h3>
        <p style={{ color: GOLD3, fontSize: 12.5, direction: "ltr", textAlign: "right" }}>{client.email}</p>
        {client.business_name && <p style={{ color: "#888", fontSize: 12 }}>{client.business_name}</p>}
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : error ? (
        <p style={{ color: "#ff8080", fontSize: 13 }}>{error}</p>
      ) : conversations.length === 0 ? (
        <p style={{ color: "#888" }}>مفيش محادثات مسجّلة لهذا العميل.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ color: "#777", fontSize: 11.5 }}>
                  {conv.messages_count || 0} رسالة · آخر رسالة {fmtDate(conv.last_message_at)}
                </span>
                <button
                  onClick={() => setFullChat(conv)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 800,
                    fontSize: 11.5,
                    color: "#000",
                    background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  💬 عرض الشات كامل
                </button>
              </div>
              <p style={{ color: "#ddd", fontSize: 13, lineHeight: 1.8 }}>
                {conv.summary?.trim() || "لسه معندوش ملخص (المحادثة ممكن تكون لسه جارية أو قصيرة جدًا)."}
              </p>
            </div>
          ))}
        </div>
      )}

      {fullChat && (
        <FullChatModal conversation={fullChat} client={client} onClose={() => setFullChat(null)} />
      )}
    </div>
  );
}

export default function AiChatsManager() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAiChatClients();
      setClients(data);
    } catch (e) {
      setLoadError(e.message || "تعذّر تحميل العملاء.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) =>
      [c.full_name, c.business_name, c.email].some((v) => (v || "").toLowerCase().includes(term))
    );
  }, [clients, search]);

  if (selectedClient) {
    return <ClientConversationsView client={selectedClient} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 دوّر بالاسم / الإيميل / النشاط..."
          style={{ ...fieldStyle, maxWidth: 320 }}
        />
        <button
          onClick={load}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}
        >
          🔄 تحديث
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : loadError ? (
        <p style={{ color: "#ff8080", fontSize: 13 }}>{loadError}</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888" }}>مفيش عملاء استخدموا المساعد الذكي حتى الآن.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <button
              key={c.user_id}
              onClick={() => setSelectedClient(c)}
              style={{
                textAlign: "right",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                padding: 16,
                cursor: "pointer",
                fontFamily: FONT,
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{c.full_name || "—"}</h3>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD3, background: "rgba(201,150,58,0.12)", padding: "2px 8px", borderRadius: 20 }}>
                  {c.conversations_count} محادثة
                </span>
              </div>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 3 }}>{c.business_name || "—"}</p>
              <p style={{ color: GOLD3, fontSize: 12, marginBottom: 8, direction: "ltr", textAlign: "right" }}>{c.email}</p>
              <p style={{ color: "#555", fontSize: 10.5 }}>آخر محادثة: {fmtDate(c.last_message_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
