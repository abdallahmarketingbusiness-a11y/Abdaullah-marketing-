// src/components/ReviewsManager.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { REVIEW_STATUS } from "../config/portfolioConfig";
import {
  fetchAllReviewsForAdmin,
  createReview,
  updateReview,
  deleteReview,
  setReviewStatus,
  reorderReviews,
  uploadReviewAvatar,
} from "../services/reviewsService";
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

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, lineHeight: 1, padding: 0, color: n <= value ? GOLD : "#3a3a3a" }}
          aria-label={`${n} نجوم`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewFormModal({ item, onClose, onSaved, flash }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    client_name: item?.client_name || "",
    company_name: item?.company_name || "",
    avatar_url: item?.avatar_url || "",
    rating: item?.rating || 5,
    comment: item?.comment || "",
    review_date: item?.review_date || new Date().toISOString().slice(0, 10),
    status: item?.status || REVIEW_STATUS.VISIBLE,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (form.client_name.trim().length < 2) {
      setError("اسم العميل مطلوب.");
      return;
    }
    if (form.comment.trim().length < 2) {
      setError("نص التعليق مطلوب.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let avatarUrl = form.avatar_url;
      if (avatarFile) avatarUrl = await uploadReviewAvatar(avatarFile);

      const payload = { ...form, avatar_url: avatarUrl };

      if (isEdit) await updateReview(item.id, payload);
      else await createReview(payload);

      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم إضافة التقييم");
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
          {isEdit ? "✏️ تعديل تقييم" : "➕ إضافة تقييم"}
        </h3>

        <label style={labelStyle}>اسم العميل</label>
        <input style={fieldStyle} value={form.client_name} onChange={(e) => update("client_name", e.target.value)} />

        <label style={labelStyle}>اسم الشركة (اختياري)</label>
        <input style={fieldStyle} value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />

        <label style={labelStyle}>عدد النجوم</label>
        <StarPicker value={form.rating} onChange={(n) => update("rating", n)} />

        <label style={labelStyle}>التعليق</label>
        <textarea rows={4} style={{ ...fieldStyle, resize: "vertical" }} value={form.comment} onChange={(e) => update("comment", e.target.value)} />

        <label style={labelStyle}>تاريخ التقييم</label>
        <input type="date" style={fieldStyle} value={form.review_date || ""} onChange={(e) => update("review_date", e.target.value)} />

        <label style={labelStyle}>صورة العميل (اختياري)</label>
        <ImageDropzone previewUrl={form.avatar_url} onFileSelected={setAvatarFile} />

        <label style={{ ...labelStyle, marginTop: 14 }}>حالة العرض</label>
        <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
          <option value={REVIEW_STATUS.VISIBLE}>👁️ ظاهر</option>
          <option value={REVIEW_STATUS.HIDDEN}>🙈 مخفي</option>
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

export default function ReviewsManager() {
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
      const data = await fetchAllReviewsForAdmin({ search });
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
    if (!window.confirm(`تأكيد حذف تقييم "${item.client_name}"؟`)) return;
    await deleteReview(item.id);
    setItems((list) => list.filter((p) => p.id !== item.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleVisibility(item) {
    const next = item.status === REVIEW_STATUS.HIDDEN ? REVIEW_STATUS.VISIBLE : REVIEW_STATUS.HIDDEN;
    const updated = await setReviewStatus(item.id, next);
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
    await reorderReviews(reordered.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="🔍 بحث بالاسم أو الشركة أو التعليق..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 0, maxWidth: 260 }}
        />
        <button
          onClick={() => setEditing({})}
          style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
        >
          ➕ تقييم جديد
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد تقييمات حتى الآن.</p>
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
                padding: 14, opacity: item.status === REVIEW_STATUS.HIDDEN ? 0.55 : 1, cursor: "grab",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                {item.avatar_url ? (
                  <img src={item.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,150,58,0.12)", color: GOLD3, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                    {(item.client_name || "?").trim().charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{item.client_name}</h3>
                  {item.company_name && <p style={{ color: "#888", fontSize: 11.5, margin: "2px 0" }}>{item.company_name}</p>}
                  <div style={{ fontSize: 12, color: GOLD, marginTop: 2 }}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</div>
                </div>
              </div>
              <p style={{ color: "#aaa", fontSize: 12, lineHeight: 1.7, marginTop: 10 }} className="line-clamp-3">{item.comment}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <ActionBtn onClick={() => setEditing(item)}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => handleToggleVisibility(item)}>👁️ {item.status === REVIEW_STATUS.HIDDEN ? "إظهار" : "إخفاء"}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(item)}>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ReviewFormModal
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
