// src/components/TestimonialsManager.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { TESTIMONIAL_STATUS } from "../config/portfolioConfig";
import {
  fetchAllTestimonialsForAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  setTestimonialStatus,
  reorderTestimonials,
  uploadTestimonialImage,
} from "../services/testimonialsService";
import ImageDropzone from "./ImageDropzone";
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

function TestimonialFormModal({ item, onClose, onSaved, flash }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    certificate_name: item?.certificate_name || "",
    issuer: item?.issuer || "",
    issue_date: item?.issue_date || "",
    description: item?.description || "",
    verify_url: item?.verify_url || "",
    image_url: item?.image_url || "",
    status: item?.status || TESTIMONIAL_STATUS.VISIBLE,
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (form.certificate_name.trim().length < 2 || form.issuer.trim().length < 2) {
      setError("اسم الشهادة والجهة المانحة مطلوبين.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imageUrl = form.image_url;
      if (imageFile) imageUrl = await uploadTestimonialImage(imageFile);

      const payload = { ...form, image_url: imageUrl, issue_date: form.issue_date || null };

      if (isEdit) await updateTestimonial(item.id, payload);
      else await createTestimonial(payload);

      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم إضافة الشهادة");
      onSaved();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 480, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 40 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 16, fontSize: 18 }}>
          {isEdit ? "✏️ تعديل شهادة" : "➕ إضافة شهادة"}
        </h3>

        <label style={labelStyle}>اسم الشهادة</label>
        <input style={fieldStyle} value={form.certificate_name} onChange={(e) => update("certificate_name", e.target.value)} />

        <label style={labelStyle}>الجهة المانحة</label>
        <input style={fieldStyle} value={form.issuer} onChange={(e) => update("issuer", e.target.value)} />

        <label style={labelStyle}>التاريخ</label>
        <input type="date" style={fieldStyle} value={form.issue_date || ""} onChange={(e) => update("issue_date", e.target.value)} />

        <label style={labelStyle}>الوصف</label>
        <textarea rows={3} style={{ ...fieldStyle, resize: "vertical" }} value={form.description} onChange={(e) => update("description", e.target.value)} />

        <label style={labelStyle}>رابط التحقق (اختياري)</label>
        <input style={fieldStyle} value={form.verify_url} onChange={(e) => update("verify_url", e.target.value)} placeholder="https://..." />

        <label style={labelStyle}>صورة الشهادة</label>
        <ImageDropzone previewUrl={form.image_url} onFileSelected={setImageFile} />

        <label style={{ ...labelStyle, marginTop: 14 }}>حالة العرض</label>
        <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
          <option value={TESTIMONIAL_STATUS.VISIBLE}>👁️ ظاهرة</option>
          <option value={TESTIMONIAL_STATUS.HIDDEN}>🙈 مخفية</option>
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

export default function TestimonialsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      const data = await fetchAllTestimonialsForAdmin({ search });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete(item) {
    if (!window.confirm(`تأكيد حذف شهادة "${item.certificate_name}"؟`)) return;
    await deleteTestimonial(item.id);
    setItems((list) => list.filter((p) => p.id !== item.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleVisibility(item) {
    const next = item.status === TESTIMONIAL_STATUS.HIDDEN ? TESTIMONIAL_STATUS.VISIBLE : TESTIMONIAL_STATUS.HIDDEN;
    const updated = await setTestimonialStatus(item.id, next);
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
    await reorderTestimonials(reordered.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <input
          placeholder="🔍 بحث بالاسم أو الجهة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 0, maxWidth: 260 }}
        />
        <button
          onClick={() => setEditing({})}
          style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
        >
          ➕ شهادة جديدة
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد شهادات حتى الآن.</p>
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
                borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
                padding: 14, opacity: item.status === TESTIMONIAL_STATUS.HIDDEN ? 0.55 : 1, cursor: "grab",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                {item.image_url && <img src={item.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{item.certificate_name}</h3>
                  <p style={{ color: "#888", fontSize: 11.5, margin: "4px 0" }}>{item.issuer}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <ActionBtn onClick={() => setEditing(item)}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => handleToggleVisibility(item)}>👁️ {item.status === TESTIMONIAL_STATUS.HIDDEN ? "إظهار" : "إخفاء"}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(item)}>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <TestimonialFormModal
          item={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          flash={flash}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}
