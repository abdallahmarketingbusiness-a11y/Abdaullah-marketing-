// src/components/BasicPackagesManager.jsx
//
// إدارة "الباقات الأساسية" (نفس الباقات اللي تظهر في قسم الأسعار بالصفحة
// الرئيسية): إنشاء، تعديل، حذف، تغيير السعر والمميزات، ترتيب بالسحب،
// وإظهار/إخفاء أي باقة. نفس نمط TestimonialsManager.jsx بالظبط.

import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchAllBasicPackagesForAdmin,
  createBasicPackage,
  updateBasicPackage,
  deleteBasicPackage,
  setBasicPackageStatus,
  reorderBasicPackages,
} from "../services/basicPackagesService";
import Toast from "./Toast";

const fieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  marginBottom: 10,
};
const labelStyle = { display: "block", color: GOLD3, fontSize: 12, marginBottom: 6, fontWeight: 700 };

const COLOR_PRESETS = ["#CD7F32", "#C0C0C0", "#C9963A", "#6ee7f7", "#a78bfa", "#7ce38b", "#ff8a8a"];

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

function PackageFormModal({ item, onClose, onSaved, flash }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    icon: item?.icon || "📦",
    tier: item?.tier || "",
    price: item?.price ?? 0,
    badge: item?.badge || "",
    color: item?.color || GOLD,
    features: item?.features?.length ? item.features : [""],
    status: item?.status || "visible",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateFeature(idx, value) {
    setForm((f) => ({ ...f, features: f.features.map((ft, i) => (i === idx ? value : ft)) }));
  }
  function addFeature() {
    setForm((f) => ({ ...f, features: [...f.features, ""] }));
  }
  function removeFeature(idx) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    const tier = form.tier.trim();
    const cleanFeatures = form.features.map((f) => f.trim()).filter(Boolean);
    if (tier.length < 2) {
      setError("اسم الباقة لازم يكون حرفين على الأقل.");
      return;
    }
    if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
      setError("السعر لازم يكون رقم صحيح.");
      return;
    }
    if (cleanFeatures.length === 0) {
      setError("لازم ميزة واحدة على الأقل.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        icon: form.icon.trim() || "📦",
        tier,
        price: Number(form.price),
        badge: form.badge.trim() || null,
        color: form.color,
        features: cleanFeatures,
        status: form.status,
      };
      if (isEdit) {
        await updateBasicPackage(item.id, payload);
      } else {
        await createBasicPackage({ ...payload, sort_order: item?.nextSortOrder ?? 0 });
      }
      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم إضافة الباقة");
      onSaved();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 520, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 40, marginBottom: 40 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 16, fontSize: 18 }}>
          {isEdit ? "✏️ تعديل باقة" : "➕ باقة أساسية جديدة"}
        </h3>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>الأيقونة</label>
            <input style={fieldStyle} value={form.icon} onChange={(e) => update("icon", e.target.value)} placeholder="🥇" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>اسم الباقة</label>
            <input style={fieldStyle} value={form.tier} onChange={(e) => update("tier", e.target.value)} placeholder="مثلاً: الاحترافية" />
          </div>
        </div>

        <label style={labelStyle}>السعر (جنيه / شهر)</label>
        <input type="number" min="0" style={fieldStyle} value={form.price} onChange={(e) => update("price", e.target.value)} />

        <label style={labelStyle}>شارة مميزة (اختياري — سيبها فاضية لو مفيش)</label>
        <input style={fieldStyle} value={form.badge} onChange={(e) => update("badge", e.target.value)} placeholder="مثلاً: الأكثر طلباً" />

        <label style={labelStyle}>لون الباقة</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <input type="color" value={form.color} onChange={(e) => update("color", e.target.value)} style={{ width: 42, height: 38, borderRadius: 8, border: "1px solid rgba(201,150,58,0.2)", background: "none", cursor: "pointer" }} />
          <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} value={form.color} onChange={(e) => update("color", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => update("color", c)} title={c}
              style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: form.color === c ? `2px solid #fff` : "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
          ))}
        </div>

        <label style={labelStyle}>المميزات</label>
        {form.features.map((ft, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} value={ft} onChange={(e) => updateFeature(idx, e.target.value)} placeholder="مثلاً: 12 بوست احترافي" />
            <button type="button" onClick={() => removeFeature(idx)} disabled={form.features.length <= 1}
              style={{ width: 36, borderRadius: 8, border: "1px solid rgba(255,80,80,0.3)", background: "none", color: "#ff8080", cursor: form.features.length <= 1 ? "not-allowed" : "pointer", opacity: form.features.length <= 1 ? 0.4 : 1 }}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addFeature} style={{ marginBottom: 14, padding: "7px 14px", borderRadius: 8, border: "1px dashed rgba(201,150,58,0.4)", background: "none", color: GOLD3, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          ➕ إضافة ميزة
        </button>

        <label style={labelStyle}>حالة العرض</label>
        <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
          <option value="visible">👁️ ظاهرة</option>
          <option value="hidden">🙈 مخفية</option>
        </select>

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BasicPackagesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllBasicPackagesForAdmin();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(item) {
    if (!window.confirm(`تأكيد حذف باقة "${item.tier}"؟ لا يمكن التراجع، وهتختفي فورًا من الصفحة الرئيسية.`)) return;
    await deleteBasicPackage(item.id);
    setItems((list) => list.filter((p) => p.id !== item.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleVisibility(item) {
    const next = item.status === "hidden" ? "visible" : "hidden";
    const updated = await setBasicPackageStatus(item.id, next);
    setItems((list) => list.map((p) => (p.id === item.id ? updated : p)));
  }

  function handleDragStart(idx) {
    setDragIndex(idx);
  }
  async function handleDrop(idx) {
    if (dragIndex === null || dragIndex === idx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    setItems(reordered);
    setDragIndex(null);
    await reorderBasicPackages(reordered.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  return (
    <div dir="rtl">
      <p style={{ color: "#888", fontSize: 12.5, marginBottom: 16 }}>
        دي نفس الباقات اللي بتظهر في قسم "الأسعار" بالصفحة الرئيسية — أي تعديل هنا (سعر، مميزات، ترتيب، إظهار/إخفاء) بيتحدّث في الموقع فورًا.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <button
          onClick={() => setEditing({ nextSortOrder: items.length })}
          style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
        >
          ➕ باقة جديدة
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد باقات أساسية حتى الآن. أضف أول باقة بزر "➕ باقة جديدة".</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              style={{
                borderRadius: 16, border: `1px solid ${item.badge ? "rgba(201,150,58,0.5)" : "rgba(255,255,255,0.08)"}`,
                background: "rgba(255,255,255,0.02)", padding: 16,
                opacity: item.status === "hidden" ? 0.55 : 1, cursor: "grab",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{item.tier}</h3>
                </div>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: item.color, border: "1px solid rgba(255,255,255,0.3)" }} />
              </div>
              {item.badge && (
                <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, color: "#000", background: item.color, borderRadius: 20, padding: "2px 9px", marginBottom: 8 }}>
                  {item.badge}
                </span>
              )}
              <p style={{ color: GOLD3, fontWeight: 800, fontSize: 17, marginBottom: 10 }}>
                {Number(item.price).toLocaleString()} ج.م <span style={{ color: "#666", fontSize: 11, fontWeight: 600 }}>/ شهر</span>
              </p>
              <ul style={{ margin: 0, marginBottom: 12, paddingRight: 18, color: "#aaa", fontSize: 12, lineHeight: 1.9 }}>
                {(item.features || []).slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
                {(item.features || []).length > 4 && <li style={{ color: "#666" }}>+{item.features.length - 4} مميزات أخرى</li>}
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <ActionBtn onClick={() => setEditing(item)}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => handleToggleVisibility(item)}>👁️ {item.status === "hidden" ? "إظهار" : "إخفاء"}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(item)}>🗑️ حذف</ActionBtn>
              </div>
              <p style={{ color: "#555", fontSize: 10.5, marginTop: 10 }}>↕️ اسحب الكارت لإعادة الترتيب</p>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <PackageFormModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          flash={flash}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}
