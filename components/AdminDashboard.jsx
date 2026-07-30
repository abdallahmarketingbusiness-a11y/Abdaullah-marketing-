// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, BG, FONT } from "../config/theme";
import {
  fetchAllPackagesForAdmin,
  deletePackage,
  setPackageStatus,
  updatePackage,
} from "../services/packagesService";
import { signOutAdmin } from "../services/authService";

function QuickEditModal({ pkg, onClose, onSaved }) {
  const [form, setForm] = useState({
    business_name: pkg.business_name,
    package_name: pkg.package_name,
    business_type: pkg.business_type,
    client_notes: pkg.client_notes || "",
    final_price: pkg.final_price || 0,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const updated = await updatePackage(pkg.id, { ...pkg, ...form });
      onSaved(updated);
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 420, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 16 }}>✏️ تعديل سريع</h3>
        {["business_name", "package_name", "business_type"].map((field) => (
          <input
            key={field}
            value={form[field]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            style={{ ...fieldStyle, marginBottom: 10 }}
          />
        ))}
        <textarea
          value={form.client_notes}
          onChange={(e) => setForm((f) => ({ ...f, client_notes: e.target.value }))}
          placeholder="ملاحظات العميل"
          rows={3}
          style={{ ...fieldStyle, marginBottom: 10, resize: "vertical" }}
        />
        <input
          type="number"
          value={form.final_price}
          onChange={(e) => setForm((f) => ({ ...f, final_price: Number(e.target.value) }))}
          style={{ ...fieldStyle, marginBottom: 10 }}
        />
        {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ onLogout, onOpenPackage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllPackagesForAdmin();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  async function handleDelete(pkg) {
    if (!window.confirm(`تأكيد حذف الباقة "${pkg.package_name}"؟ لا يمكن التراجع.`)) return;
    await deletePackage(pkg.id);
    setItems((list) => list.filter((p) => p.id !== pkg.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleVisibility(pkg) {
    const next = pkg.status === "hidden" ? "visible" : "hidden";
    const updated = await setPackageStatus(pkg.id, next);
    setItems((list) => list.map((p) => (p.id === pkg.id ? updated : p)));
  }

  async function handleTogglePin(pkg) {
    const next = pkg.status === "featured" ? "visible" : "featured";
    const updated = await setPackageStatus(pkg.id, next);
    setItems((list) => list.map((p) => (p.id === pkg.id ? updated : p)));
  }

  function handleCopyLink(pkg) {
    const url = `${window.location.origin}${window.location.pathname}#package-details?id=${pkg.id}`;
    navigator.clipboard?.writeText(url);
    flash("📄 تم نسخ الرابط");
  }

  function handleShare(pkg) {
    const url = `${window.location.origin}${window.location.pathname}#package-details?id=${pkg.id}`;
    const text = `شوف باقة "${pkg.package_name}" لـ ${pkg.business_name}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", paddingTop: 110, paddingBottom: 60 }}>
      <div className="max-w-6xl mx-auto px-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: FONT, fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 900, color: "#fff" }}>
            🛠️ لوحة تحكم الباقات
          </h1>
          <button
            onClick={onLogout}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}
          >
            تسجيل الخروج
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>جاري التحميل...</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#888" }}>لا توجد باقات حتى الآن.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${pkg.status === "featured" ? "rgba(201,150,58,0.5)" : "rgba(255,255,255,0.08)"}`,
                  background: "rgba(255,255,255,0.02)",
                  padding: 18,
                  opacity: pkg.status === "hidden" ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{pkg.package_name}</h3>
                  <span style={{ fontSize: 11, color: GOLD3 }}>{statusLabel(pkg.status)}</span>
                </div>
                <p style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>{pkg.business_name} · {pkg.business_type}</p>
                <p style={{ color: GOLD3, fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  {(pkg.final_price || 0).toLocaleString()} ج.م
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <ActionBtn onClick={() => setEditing(pkg)}>✏️ تعديل</ActionBtn>
                  <ActionBtn onClick={() => handleDelete(pkg)} danger>🗑️ حذف</ActionBtn>
                  <ActionBtn onClick={() => handleTogglePin(pkg)}>📌 {pkg.status === "featured" ? "إلغاء التثبيت" : "تثبيت"}</ActionBtn>
                  <ActionBtn onClick={() => handleToggleVisibility(pkg)}>👁️ {pkg.status === "hidden" ? "إظهار" : "إخفاء"}</ActionBtn>
                  <ActionBtn onClick={() => handleShare(pkg)}>📤 مشاركة</ActionBtn>
                  <ActionBtn onClick={() => handleCopyLink(pkg)}>📄 نسخ الرابط</ActionBtn>
                  {onOpenPackage && <ActionBtn onClick={() => onOpenPackage(pkg.id)}>👁️‍🗨️ عرض</ActionBtn>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <QuickEditModal
          pkg={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((list) => list.map((p) => (p.id === updated.id ? updated : p)));
            setEditing(null);
            flash("✅ تم حفظ التعديلات");
          }}
        />
      )}

      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 800, fontSize: 13 }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function statusLabel(status) {
  if (status === "featured") return "⭐ مميزة";
  if (status === "hidden") return "🙈 مخفية";
  return "👁️ ظاهرة";
}

function ActionBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
        border: `1px solid ${danger ? "rgba(255,80,80,0.35)" : "rgba(201,150,58,0.3)"}`,
        background: "none", color: danger ? "#ff8080" : "#ddd",
      }}
    >
      {children}
    </button>
  );
}

const fieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
};
