// src/components/NotificationsManager.jsx
//
// تبويب "🔔 الإشعارات" في لوحة السوبر أدمن — إرسال إشعار لعميل محدد أو لكل
// العملاء دفعة واحدة، مع إمكانية الجدولة (يظهر للعميل في وقت مستقبلي)،
// وتعديل/حذف أي إشعار (أو مجموعة إشعارات "لكل العملاء" مرة واحدة).

import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { fetchAllClientsForAdmin } from "../services/clientAuthService";
import {
  fetchAllNotificationsForAdmin,
  sendNotificationToClient,
  broadcastNotificationToAll,
  updateNotification,
  updateBroadcast,
  deleteNotification,
  deleteBroadcast,
} from "../services/notificationsAdminService";

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

const labelStyle = { display: "block", color: "#999", fontSize: 12, marginBottom: 5, fontWeight: 700 };

const NOTIF_TYPES = [
  { value: "default", label: "🔔 عام" },
  { value: "invoice", label: "🧾 فاتورة" },
  { value: "report", label: "📄 تقرير" },
  { value: "script", label: "✍️ سكربت" },
  { value: "campaign", label: "📢 حملة" },
];

function typeLabel(t) {
  return NOTIF_TYPES.find((x) => x.value === t)?.label || t;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = { title: "", notifType: "default", notifDate: todayISO(), scheduledAt: "" };

function ActionBtn({ children, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
        border: `1px solid ${danger ? "rgba(255,80,80,0.35)" : "rgba(201,150,58,0.3)"}`,
        background: "none", color: danger ? "#ff8080" : "#ddd", fontFamily: FONT,
      }}
    >
      {children}
    </button>
  );
}

function ComposePanel({ clients, onSent, flash }) {
  const [target, setTarget] = useState("all"); // "all" | "single"
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function send() {
    setError("");
    if (!form.title.trim()) {
      setError("اكتب نص الإشعار.");
      return;
    }
    if (target === "single" && !clientId) {
      setError("اختار العميل الأول.");
      return;
    }
    setSending(true);
    try {
      const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null;
      if (target === "all") {
        const res = await broadcastNotificationToAll({ ...form, scheduledAt });
        flash(`📢 تم إرسال الإشعار لـ ${res.count} عميل`);
      } else {
        await sendNotificationToClient(clientId, { ...form, scheduledAt });
        flash("✅ تم إرسال الإشعار");
      }
      setForm(emptyForm);
      onSent();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الإرسال.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ border: "1px solid rgba(201,150,58,0.2)", borderRadius: 16, padding: 18, marginBottom: 24, background: "rgba(255,255,255,0.015)" }}>
      <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 14 }}>✉️ إرسال إشعار جديد</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setTarget("all")}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${target === "all" ? GOLD : "rgba(255,255,255,0.1)"}`,
            background: target === "all" ? "rgba(201,150,58,0.12)" : "none",
            color: target === "all" ? GOLD3 : "#aaa",
          }}
        >
          📢 لكل العملاء
        </button>
        <button
          onClick={() => setTarget("single")}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${target === "single" ? GOLD : "rgba(255,255,255,0.1)"}`,
            background: target === "single" ? "rgba(201,150,58,0.12)" : "none",
            color: target === "single" ? GOLD3 : "#aaa",
          }}
        >
          👤 عميل محدد
        </button>
      </div>

      {target === "single" && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>اختار العميل</label>
          <select style={fieldStyle} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— اختار —</option>
            {clients.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.full_name || c.business_name || c.user_id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>نص الإشعار</label>
        <input style={fieldStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: تقريرك الشهري جاهز 📊" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>النوع</label>
          <select style={fieldStyle} value={form.notifType} onChange={(e) => set("notifType", e.target.value)}>
            {NOTIF_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>التاريخ</label>
          <input type="date" style={fieldStyle} value={form.notifDate} onChange={(e) => set("notifDate", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>⏰ جدولة (اختياري) — اسيبها فاضية عشان يتبعت فورًا</label>
        <input type="datetime-local" style={fieldStyle} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
      </div>

      {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={send}
        disabled={sending}
        style={{ padding: "11px 22px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer", fontFamily: FONT, fontSize: 13 }}
      >
        {sending ? "جاري الإرسال..." : "🚀 إرسال"}
      </button>
    </div>
  );
}

function EditModal({ item, onClose, onSaved, flash }) {
  const isBroadcast = !!item.broadcast_id;
  const [form, setForm] = useState({
    title: item.title,
    notifType: item.notif_type,
    notifDate: item.notif_date || todayISO(),
    scheduledAt: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.title.trim()) {
      setError("اكتب نص الإشعار.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null;
      if (isBroadcast) {
        await updateBroadcast(item.broadcast_id, { ...form, scheduledAt });
      } else {
        await updateNotification(item.id, { ...form, scheduledAt });
      }
      flash("✅ تم حفظ التعديلات");
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "حدث خطأ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 22 }}>
        <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 16, marginBottom: 16 }}>
          ✏️ تعديل {isBroadcast ? "الإشعار الجماعي" : "الإشعار"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>نص الإشعار</label>
            <input style={fieldStyle} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>النوع</label>
              <select style={fieldStyle} value={form.notifType} onChange={(e) => set("notifType", e.target.value)}>
                {NOTIF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>التاريخ</label>
              <input type="date" style={fieldStyle} value={form.notifDate} onChange={(e) => set("notifDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>⏰ الجدولة (اختياري)</label>
            <input type="datetime-local" style={fieldStyle} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
          </div>
          {error && <p style={{ color: "#ff8080", fontSize: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>إلغاء</button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// بيجمع صفوف الإرسال الجماعي (نفس broadcast_id) في عنصر واحد للعرض
function groupNotifications(rows) {
  const groups = [];
  const seenBroadcasts = new Map();
  rows.forEach((r) => {
    if (r.broadcast_id) {
      if (seenBroadcasts.has(r.broadcast_id)) {
        seenBroadcasts.get(r.broadcast_id).count += 1;
      } else {
        const g = { ...r, isBroadcast: true, count: 1 };
        seenBroadcasts.set(r.broadcast_id, g);
        groups.push(g);
      }
    } else {
      groups.push({ ...r, isBroadcast: false });
    }
  });
  return groups;
}

export default function NotificationsManager() {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }

  async function load() {
    setLoading(true);
    try {
      const [notifs, clientList] = await Promise.all([
        fetchAllNotificationsForAdmin(),
        fetchAllClientsForAdmin(),
      ]);
      setRows(notifs);
      setClients(clientList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => groupNotifications(rows), [rows]);

  async function handleDelete(item) {
    const msg = item.isBroadcast
      ? `هتحذف الإشعار ده من عند ${item.count} عميل. تأكيد؟`
      : "تأكيد حذف الإشعار؟";
    if (!window.confirm(msg)) return;
    const key = item.isBroadcast ? item.broadcast_id : item.id;
    setBusyKey(key);
    try {
      if (item.isBroadcast) await deleteBroadcast(item.broadcast_id);
      else await deleteNotification(item.id);
      flash("🗑️ تم الحذف");
      load();
    } catch (e) {
      flash(`❌ ${e.message}`);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div dir="rtl">
      <ComposePanel clients={clients} onSent={load} flash={flash} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>📋 الإشعارات المرسلة</h3>
        <button onClick={load} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>🔄 تحديث</button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : grouped.length === 0 ? (
        <p style={{ color: "#888" }}>مفيش إشعارات اتبعتت لسه.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {grouped.map((item) => {
            const key = item.isBroadcast ? item.broadcast_id : item.id;
            const isScheduled = item.scheduled_at && new Date(item.scheduled_at) > new Date();
            return (
              <div key={key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13.5 }}>{item.title}</span>
                    <span style={{ fontSize: 10.5, color: GOLD3, border: "1px solid rgba(201,150,58,0.3)", borderRadius: 6, padding: "1px 7px" }}>
                      {typeLabel(item.notif_type)}
                    </span>
                    {isScheduled && (
                      <span style={{ fontSize: 10.5, color: "#facc15", border: "1px solid rgba(250,204,21,0.3)", borderRadius: 6, padding: "1px 7px" }}>
                        ⏰ مجدول: {new Date(item.scheduled_at).toLocaleString("ar-EG")}
                      </span>
                    )}
                  </div>
                  <p style={{ color: "#888", fontSize: 11.5 }}>
                    {item.isBroadcast
                      ? `📢 لكل العملاء (${item.count} عميل)`
                      : `👤 ${item.clients?.full_name || item.clients?.business_name || "عميل"}`}
                    {" · "}{item.notif_date}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn onClick={() => setEditing(item)} disabled={busyKey === key}>✏️ تعديل</ActionBtn>
                  <ActionBtn onClick={() => handleDelete(item)} danger disabled={busyKey === key}>🗑️ حذف</ActionBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} onSaved={load} flash={flash} />
      )}

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 800, fontSize: 13, zIndex: 300 }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
