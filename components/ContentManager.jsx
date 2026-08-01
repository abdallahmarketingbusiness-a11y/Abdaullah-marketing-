// src/components/ContentManager.jsx
// إدارة موحّدة لدراسات الحالة + المدونة + المنشورات (بوستات وفيديوهات) —
// تبويبات فرعية جوه تبويب واحد بدل 3 أقسام منفصلة في السوبر أدمن.
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { CONTENT_STATUS, SOCIAL_POST_TYPE, SOCIAL_PLATFORMS } from "../config/contentConfig";
import {
  fetchAllForAdmin,
  createContent,
  updateContent,
  deleteContent,
  setContentStatus,
  reorderContent,
  uploadContentImage,
} from "../services/contentService";
import ImageDropzone from "./ImageDropzone";
import GalleryDropzone from "./GalleryDropzone";
import Toast from "./Toast";
import { broadcastNotificationToAll } from "../services/notificationsAdminService";

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

const ENTITY_CONFIG = {
  caseStudies: {
    label: "دراسات الحالة",
    titleField: "client_name",
    titlePlaceholder: "اسم العميل",
    newLabel: "➕ دراسة حالة جديدة",
    emptyLabel: "لا توجد دراسات حالة حتى الآن.",
    fields: [
      { key: "client_name", label: "اسم العميل", type: "text" },
      { key: "industry", label: "المجال (مطاعم / كافيهات ...)", type: "text" },
      { key: "badge_stat", label: "الرقم البارز (مثال: +320%)", type: "text" },
      { key: "metric_label", label: "وصف الرقم", type: "text" },
      { key: "summary", label: "ملخص الدراسة", type: "textarea" },
      { key: "tags", label: "الوسوم (افصل بفاصلة)", type: "tags" },
      { key: "image_url", label: "صورة", type: "image" },
    ],
  },
  blogPosts: {
    label: "المدونة",
    titleField: "title",
    titlePlaceholder: "عنوان المقال",
    newLabel: "➕ مقال جديد",
    emptyLabel: "لا توجد مقالات حتى الآن.",
    fields: [
      { key: "title", label: "العنوان", type: "text" },
      { key: "category", label: "التصنيف", type: "text" },
      { key: "read_time_minutes", label: "مدة القراءة (دقائق)", type: "number" },
      { key: "excerpt", label: "مقتطف قصير", type: "textarea" },
      { key: "content", label: "المحتوى الكامل (اختياري)", type: "textarea" },
      { key: "cover_image_url", label: "صورة الغلاف", type: "image" },
    ],
  },
  socialPosts: {
    label: "المنشورات",
    titleField: "title",
    titlePlaceholder: "عنوان المنشور (داخلي، مش بيظهر للعميل)",
    newLabel: "➕ منشور جديد",
    emptyLabel: "لا توجد منشورات حتى الآن.",
    fields: [
      { key: "title", label: "العنوان", type: "text" },
      { key: "platform", label: "المنصة", type: "select", options: SOCIAL_PLATFORMS },
      { key: "post_type", label: "النوع", type: "select", options: [SOCIAL_POST_TYPE.POST, SOCIAL_POST_TYPE.VIDEO] },
      { key: "category", label: "التصنيف", type: "text" },
      { key: "tags", label: "الوسوم (افصل بفاصلة)", type: "tags" },
      { key: "caption", label: "الكابشن", type: "textarea" },
      { key: "content", label: "المحتوى الكامل (اختياري)", type: "textarea" },
      { key: "stat_label", label: "إحصائية (مثال: 45K مشاهدة)", type: "text" },
      { key: "media_url", label: "صورة الغلاف", type: "image" },
      { key: "gallery_urls", label: "صور إضافية", type: "gallery" },
      { key: "video_url", label: "رابط الفيديو (لو النوع فيديو)", type: "text" },
      { key: "is_pinned", label: "📌 تثبيت المنشور في الأعلى", type: "checkbox" },
      { key: "scheduled_at", label: "⏰ جدولة النشر (اختياري)", type: "datetime" },
    ],
  },
};

function emptyForm(entity) {
  const cfg = ENTITY_CONFIG[entity];
  const form = { status: CONTENT_STATUS.PUBLISHED };
  cfg.fields.forEach((f) => {
    if (f.type === "tags") form[f.key] = [];
    else if (f.type === "gallery") form[f.key] = [];
    else if (f.type === "checkbox") form[f.key] = false;
    else if (f.type === "datetime") form[f.key] = "";
    else if (f.type === "number") form[f.key] = f.key === "read_time_minutes" ? 4 : 0;
    else if (f.type === "select") form[f.key] = f.options[0];
    else form[f.key] = "";
  });
  return form;
}

function ContentFormModal({ entity, item, onClose, onSaved, flash }) {
  const cfg = ENTITY_CONFIG[entity];
  const isEdit = !!item;
  const initial = isEdit
    ? {
        ...emptyForm(entity),
        ...item,
        tags: Array.isArray(item.tags) ? item.tags : [],
        scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
      }
    : emptyForm(entity);
  const [form, setForm] = useState(initial);
  const [imageFile, setImageFile] = useState(null);
  const [galleryItems, setGalleryItems] = useState(
    (item?.gallery_urls || []).map((url) => ({ id: crypto.randomUUID(), url }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const imageField = cfg.fields.find((f) => f.type === "image")?.key;

  async function handleSave() {
    if (!form[cfg.titleField] || form[cfg.titleField].trim().length < 2) {
      setError("الحقل الأساسي مطلوب.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let payload = { ...form };
      if (imageFile && imageField) {
        payload[imageField] = await uploadContentImage(imageFile);
      }
      if (cfg.fields.some((f) => f.type === "tags")) {
        payload.tags = Array.isArray(payload.tags)
          ? payload.tags
          : String(payload.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      }
      if (cfg.fields.some((f) => f.type === "gallery")) {
        const uploaded = await Promise.all(
          galleryItems.map((it) => (it.file ? uploadContentImage(it.file) : Promise.resolve(it.url)))
        );
        payload.gallery_urls = uploaded;
      }
      if (cfg.fields.some((f) => f.type === "datetime")) {
        payload.scheduled_at = payload.scheduled_at ? new Date(payload.scheduled_at).toISOString() : null;
      }

      const wasPublished = isEdit && item.status === CONTENT_STATUS.PUBLISHED;
      if (isEdit) await updateContent(entity, item.id, payload);
      else await createContent(entity, payload);

      // إشعار تلقائي لكل العملاء عند نشر منشور جديد (لأول مرة)
      if (entity === "socialPosts" && payload.status === CONTENT_STATUS.PUBLISHED && !wasPublished) {
        broadcastNotificationToAll({
          title: `🆕 منشور جديد: ${payload.title}`,
          notifType: "campaign",
          notifDate: new Date().toISOString().slice(0, 10),
        }).catch(() => {}); // فشل الإشعار مايوقفش حفظ المنشور
      }

      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم الإضافة");
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
          {isEdit ? `✏️ تعديل ${cfg.label}` : cfg.newLabel}
        </h3>

        {cfg.fields.map((f) => (
          <div key={f.key}>
            {f.type !== "checkbox" && <label style={labelStyle}>{f.label}</label>}
            {f.type === "textarea" && (
              <textarea rows={3} style={{ ...fieldStyle, resize: "vertical" }} value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} />
            )}
            {f.type === "text" && (
              <input style={fieldStyle} value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} placeholder={f.key === cfg.titleField ? cfg.titlePlaceholder : ""} />
            )}
            {f.type === "number" && (
              <input type="number" style={fieldStyle} value={form[f.key] ?? 0} onChange={(e) => update(f.key, Number(e.target.value))} />
            )}
            {f.type === "select" && (
              <select style={fieldStyle} value={form[f.key]} onChange={(e) => update(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {f.type === "tags" && (
              <input
                style={fieldStyle}
                value={Array.isArray(form[f.key]) ? form[f.key].join(", ") : form[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder="سوشيال ميديا, إعلانات, تصوير"
              />
            )}
            {f.type === "image" && (
              <ImageDropzone previewUrl={form[f.key]} onFileSelected={setImageFile} />
            )}
            {f.type === "gallery" && (
              <GalleryDropzone items={galleryItems} onChange={setGalleryItems} />
            )}
            {f.type === "checkbox" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#ddd", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form[f.key]} onChange={(e) => update(f.key, e.target.checked)} />
                {f.label}
              </label>
            )}
            {f.type === "datetime" && (
              <input type="datetime-local" style={fieldStyle} value={form[f.key] || ""} onChange={(e) => update(f.key, e.target.value)} />
            )}
          </div>
        ))}

        <label style={{ ...labelStyle, marginTop: 14 }}>حالة العرض</label>
        <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
          <option value={CONTENT_STATUS.PUBLISHED}>👁️ منشور</option>
          <option value={CONTENT_STATUS.DRAFT}>📝 مسودة</option>
          <option value={CONTENT_STATUS.HIDDEN}>🙈 مخفي</option>
        </select>

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginTop: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
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

function EntitySection({ entity }) {
  const cfg = ENTITY_CONFIG[entity];
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
      const data = await fetchAllForAdmin(entity, { search });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, entity]);

  async function handleDelete(item) {
    if (!window.confirm(`تأكيد حذف "${item[cfg.titleField]}"؟`)) return;
    await deleteContent(entity, item.id);
    setItems((list) => list.filter((p) => p.id !== item.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleVisibility(item) {
    const next = item.status === CONTENT_STATUS.HIDDEN ? CONTENT_STATUS.PUBLISHED : CONTENT_STATUS.HIDDEN;
    const updated = await setContentStatus(entity, item.id, next);
    setItems((list) => list.map((p) => (p.id === item.id ? updated : p)));
    if (entity === "socialPosts" && next === CONTENT_STATUS.PUBLISHED) {
      broadcastNotificationToAll({
        title: `🆕 منشور جديد: ${updated.title}`,
        notifType: "campaign",
        notifDate: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  }

  function handleDragStart(idx) { setDragIndex(idx); }
  async function handleDrop(idx) {
    if (dragIndex === null || dragIndex === idx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    setItems(reordered);
    setDragIndex(null);
    await reorderContent(entity, reordered.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  const imageField = cfg.fields.find((f) => f.type === "image")?.key;

  return (
    <div dir="rtl">
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="🔍 بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 0, maxWidth: 260 }}
        />
        <button
          onClick={() => setEditing({})}
          style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
        >
          {cfg.newLabel}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>{cfg.emptyLabel}</p>
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
                padding: 14, opacity: item.status === CONTENT_STATUS.HIDDEN ? 0.55 : 1, cursor: "grab",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                {imageField && item[imageField] && (
                  <img src={item[imageField]} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                    {item.is_pinned && <span title="مثبّت">📌 </span>}
                    {item[cfg.titleField]}
                  </h3>
                  {entity === "socialPosts" && (
                    <p style={{ color: "#888", fontSize: 11.5, margin: "4px 0" }}>{item.platform} · {item.post_type === "video" ? "فيديو" : "بوست"}</p>
                  )}
                  {entity === "blogPosts" && <p style={{ color: "#888", fontSize: 11.5, margin: "4px 0" }}>{item.category}</p>}
                  {entity === "caseStudies" && <p style={{ color: "#888", fontSize: 11.5, margin: "4px 0" }}>{item.industry}</p>}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <ActionBtn onClick={() => setEditing(item)}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => handleToggleVisibility(item)}>👁️ {item.status === CONTENT_STATUS.HIDDEN ? "إظهار" : "إخفاء"}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(item)}>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ContentFormModal
          entity={entity}
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

const SUB_TABS = [
  { id: "caseStudies", label: "📊 دراسات الحالة" },
  { id: "socialPosts", label: "🖼️ المنشورات" },
  { id: "blogPosts", label: "📝 المدونة" },
];

export default function ContentManager() {
  const [sub, setSub] = useState("caseStudies");
  return (
    <div dir="rtl">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${sub === t.id ? GOLD : "rgba(255,255,255,0.1)"}`,
              background: sub === t.id ? "rgba(201,150,58,0.12)" : "none",
              color: sub === t.id ? GOLD3 : "#aaa",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <EntitySection key={sub} entity={sub} />
    </div>
  );
}
