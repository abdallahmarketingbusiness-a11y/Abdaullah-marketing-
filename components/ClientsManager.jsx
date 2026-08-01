// src/components/ClientsManager.jsx
//
// تبويب "👥 إدارة العملاء" في لوحة السوبر أدمن — التحكم الكامل في حسابات
// العملاء: إضافة / تعديل / حذف / تفعيل-إيقاف / إعادة تعيين كلمة مرور / سجل نشاط.

import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchClientsFull,
  createClientByAdmin,
  updateClientByAdmin,
  deleteClientByAdmin,
  resetClientPasswordByAdmin,
  setClientActiveByAdmin,
  fetchClientActivityLog,
  fetchClientSubscriptionSummary,
} from "../services/clientAdminService";

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

function ActionBtn({ children, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        border: `1px solid ${danger ? "rgba(255,80,80,0.35)" : "rgba(201,150,58,0.3)"}`,
        background: "none",
        color: danger ? "#ff8080" : "#ddd",
        fontFamily: FONT,
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, width = 440 }) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const emptyForm = { email: "", password: "", fullName: "", phone: "", businessName: "" };

function ClientFormModal({ initial, onClose, onSaved, flash }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? { email: initial.email, password: "", fullName: initial.full_name, phone: initial.phone, businessName: initial.business_name }
      : { ...emptyForm, password: generatePassword() }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError("");
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("اكتب إيميل صحيح.");
      return;
    }
    if (!isEdit && form.password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const updated = await updateClientByAdmin({
          userId: initial.user_id,
          email: form.email.trim(),
          fullName: form.fullName,
          phone: form.phone,
          businessName: form.businessName,
        });
        onSaved({ ...initial, ...updated });
        flash("✅ تم حفظ بيانات العميل");
      } else {
        const created = await createClientByAdmin({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
          businessName: form.businessName,
        });
        onSaved({ ...created, created_at: new Date().toISOString(), is_active: true, email_confirmed: true, isNew: true });
        flash("✅ تم إنشاء حساب العميل");
      }
      onClose();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "✏️ تعديل بيانات العميل" : "➕ إضافة عميل جديد"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>الإيميل (بيستخدمه العميل لتسجيل الدخول)</label>
          <input style={fieldStyle} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" dir="ltr" />
        </div>
        {!isEdit && (
          <div>
            <label style={labelStyle}>كلمة المرور الأولية</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...fieldStyle, flex: 1 }} value={form.password} onChange={(e) => set("password", e.target.value)} dir="ltr" />
              <button
                type="button"
                onClick={() => set("password", generatePassword())}
                style={{ padding: "0 12px", borderRadius: 10, border: "1px solid rgba(201,150,58,0.3)", background: "none", color: GOLD3, fontSize: 12, cursor: "pointer" }}
              >
                🎲 توليد
              </button>
            </div>
            <p style={{ color: "#666", fontSize: 11, marginTop: 4 }}>ابعتها للعميل بنفسك — مش هتتبعت تلقائي.</p>
          </div>
        )}
        <div>
          <label style={labelStyle}>اسم العميل / المسؤول</label>
          <input style={fieldStyle} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>رقم الهاتف</label>
          <input style={fieldStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" />
        </div>
        <div>
          <label style={labelStyle}>اسم النشاط التجاري</label>
          <input style={fieldStyle} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </div>
        {error && <p style={{ color: "#ff8080", fontSize: 12 }}>{error}</p>}
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer", fontFamily: FONT }}
        >
          {saving ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ client, onClose, flash }) {
  const [password, setPassword] = useState(generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await resetClientPasswordByAdmin(client.user_id, password);
      flash("🔒 تم تغيير كلمة المرور");
      onClose();
    } catch (e) {
      setError(e.message || "حدث خطأ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`🔒 إعادة تعيين كلمة مرور: ${client.full_name || client.email}`} onClose={onClose} width={400}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>كلمة المرور الجديدة</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...fieldStyle, flex: 1 }} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              style={{ padding: "0 12px", borderRadius: 10, border: "1px solid rgba(201,150,58,0.3)", background: "none", color: GOLD3, fontSize: 12, cursor: "pointer" }}
            >
              🎲 توليد
            </button>
          </div>
        </div>
        {error && <p style={{ color: "#ff8080", fontSize: 12 }}>{error}</p>}
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer", fontFamily: FONT }}
        >
          {saving ? "جاري الحفظ..." : "تغيير كلمة المرور"}
        </button>
        <p style={{ color: "#666", fontSize: 11 }}>هتحتاج تبعتها للعميل بنفسك — العميل مش هيتبعتله إشعار تلقائي.</p>
      </div>
    </Modal>
  );
}

const ACTION_LABELS = {
  create: "🆕 إنشاء الحساب",
  update: "✏️ تعديل البيانات",
  activate: "✅ تفعيل الحساب",
  deactivate: "⛔ إيقاف الحساب",
  delete: "🗑️ حذف الحساب",
  "reset-password": "🔒 إعادة تعيين كلمة المرور",
};

function ActivityLogModal({ client, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [log, subSummary] = await Promise.all([
        fetchClientActivityLog(client.user_id).catch(() => []),
        fetchClientSubscriptionSummary(client.user_id).catch(() => null),
      ]);
      setRows(log);
      setSub(subSummary);
      setLoading(false);
    })();
  }, [client.user_id]);

  return (
    <Modal title={`📜 سجل نشاط: ${client.full_name || client.email}`} onClose={onClose} width={480}>
      {sub && (
        <div style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: "#ddd" }}>
          💳 آخر اشتراك: <strong style={{ color: GOLD3 }}>{sub.package_name}</strong> — الحالة: {sub.status} {sub.end_date ? `— حتى ${sub.end_date}` : ""}
        </div>
      )}
      {loading ? (
        <p style={{ color: "#888", fontSize: 13 }}>جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>مفيش نشاط مسجّل على الحساب ده لسه.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{ACTION_LABELS[r.action] || r.action}</span>
                <span style={{ color: "#777" }}>{new Date(r.created_at).toLocaleString("ar-EG")}</span>
              </div>
              {r.actor_email && <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>بواسطة: {r.actor_email}</p>}
            </div>
          ))}
        </div>
      )}
      <p style={{ color: "#555", fontSize: 10.5, marginTop: 14 }}>
        السجل ده بيغطي عمليات إدارة الحساب نفسه (إنشاء/تعديل/تفعيل/إيقاف/حذف/كلمة مرور).
      </p>
    </Modal>
  );
}

export default function ClientsManager() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [formModal, setFormModal] = useState(null); // null | "new" | client obj (edit)
  const [resetModal, setResetModal] = useState(null);
  const [logModal, setLogModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2800);
  }

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchClientsFull();
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
      [c.full_name, c.business_name, c.phone, c.email].some((v) => (v || "").toLowerCase().includes(term))
    );
  }, [clients, search]);

  async function handleToggleActive(client) {
    setBusyId(client.user_id);
    try {
      const nextActive = !client.is_active;
      await setClientActiveByAdmin(client.user_id, nextActive);
      setClients((list) => list.map((c) => (c.user_id === client.user_id ? { ...c, is_active: nextActive } : c)));
      flash(nextActive ? "✅ تم تفعيل الحساب" : "⛔ تم إيقاف الحساب");
    } catch (e) {
      flash(`❌ ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(client) {
    const confirmText = `هتحذف حساب "${client.full_name || client.email}" نهائيًا مع كل بياناته (اشتراكات/ملفات/تقارير/تحليلات). لا يمكن التراجع. اكتب "حذف" للتأكيد.`;
    const typed = window.prompt(confirmText);
    if (typed !== "حذف") return;
    setBusyId(client.user_id);
    try {
      await deleteClientByAdmin(client.user_id);
      setClients((list) => list.filter((c) => c.user_id !== client.user_id));
      flash("🗑️ تم حذف الحساب نهائيًا");
    } catch (e) {
      flash(`❌ ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 دوّر بالاسم / الإيميل / النشاط / الهاتف..."
          style={{ ...fieldStyle, maxWidth: 320 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}
          >
            🔄 تحديث
          </button>
          <button
            onClick={() => setFormModal("new")}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer", fontSize: 13 }}
          >
            ➕ إضافة عميل جديد
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : loadError ? (
        <p style={{ color: "#ff8080", fontSize: 13 }}>{loadError}</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888" }}>مفيش عملاء حتى الآن.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <div
              key={c.user_id}
              style={{
                borderRadius: 16,
                border: `1px solid ${c.is_active ? "rgba(255,255,255,0.08)" : "rgba(255,80,80,0.3)"}`,
                background: "rgba(255,255,255,0.02)",
                padding: 16,
                opacity: c.is_active ? 1 : 0.7,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{c.full_name || "—"}</h3>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: c.is_active ? "#4ade80" : "#ff8080" }}>
                  {c.is_active ? "🟢 نشط" : "🔴 موقوف"}
                </span>
              </div>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 3 }}>{c.business_name || "—"}</p>
              <p style={{ color: GOLD3, fontSize: 12, marginBottom: 3, direction: "ltr", textAlign: "right" }}>{c.email}</p>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 10, direction: "ltr", textAlign: "right" }}>{c.phone || "—"}</p>
              <p style={{ color: "#555", fontSize: 10.5, marginBottom: 12 }}>
                انضم: {c.created_at ? new Date(c.created_at).toLocaleDateString("ar-EG") : "—"}
                {c.last_sign_in_at ? ` · آخر دخول: ${new Date(c.last_sign_in_at).toLocaleDateString("ar-EG")}` : ""}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <ActionBtn onClick={() => setFormModal(c)} disabled={busyId === c.user_id}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => setResetModal(c)} disabled={busyId === c.user_id}>🔒 كلمة المرور</ActionBtn>
                <ActionBtn onClick={() => handleToggleActive(c)} disabled={busyId === c.user_id}>
                  {c.is_active ? "⛔ إيقاف" : "✅ تفعيل"}
                </ActionBtn>
                <ActionBtn onClick={() => setLogModal(c)} disabled={busyId === c.user_id}>📜 سجل النشاط</ActionBtn>
                <ActionBtn onClick={() => handleDelete(c)} danger disabled={busyId === c.user_id}>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {formModal && (
        <ClientFormModal
          initial={formModal === "new" ? null : formModal}
          onClose={() => setFormModal(null)}
          flash={flash}
          onSaved={(saved) => {
            setClients((list) => {
              if (saved.isNew) return [saved, ...list];
              return list.map((c) => (c.user_id === saved.user_id ? { ...c, ...saved } : c));
            });
          }}
        />
      )}

      {resetModal && <ResetPasswordModal client={resetModal} onClose={() => setResetModal(null)} flash={flash} />}
      {logModal && <ActivityLogModal client={logModal} onClose={() => setLogModal(null)} />}

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 800, fontSize: 13, zIndex: 300 }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
