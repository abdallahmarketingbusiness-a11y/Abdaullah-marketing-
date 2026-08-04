// src/components/HomepageSectionsManager.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2 } from "../config/theme";
import { CUSTOM_SECTION_TYPES, CORE_SECTION_LABELS } from "../config/homepageConfig";
import {
  fetchAllHomepageSections,
  createHomepageSection,
  updateHomepageSectionContent,
  setHomepageSectionVisibility,
  deleteHomepageSection,
  reorderHomepageSections,
  uploadHomepageImage,
} from "../services/homepageService";
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

const labelStyle = { fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 6, display: "block" };

// أي حقول نص عامة تتعرض لكل نوع قسم
const FORM_LAYOUT = {
  hero: { eyebrow: true, subtitle: true, buttons: true, items: "stats" },
  "posts-feed": { eyebrow: true, title: true, subtitle: true },
  services: { eyebrow: true, title: true, subtitle: true, buttons: true },
  "case-study": { eyebrow: true, title: true, subtitle: true, client_name: true, body: true, image: true, buttons: true, items: "case" },
  portfolio: { eyebrow: true, title: true, subtitle: true },
  tips: { eyebrow: true, title: true, subtitle: true, items: "tips" },
  pricing: { eyebrow: true, title: true, subtitle: true },
  why: { eyebrow: true, title: true, items: "why" },
  testimonials: { eyebrow: true, title: true, subtitle: true, client_name: true, sub_label: true, body: true, image: true },
  process: { eyebrow: true, title: true, subtitle: true, items: "process" },
};

const CUSTOM_LAYOUT = { eyebrow: true, title: true, subtitle: true, body: true, image: true, badge_text: true, buttons: true };

function layoutFor(section) {
  if (section.kind === "core") return FORM_LAYOUT[section.section_key] || { title: true, subtitle: true };
  return CUSTOM_LAYOUT;
}

function sectionDisplayName(section) {
  if (section.kind === "core") return CORE_SECTION_LABELS[section.section_key] || section.section_key;
  const t = CUSTOM_SECTION_TYPES[section.custom_type];
  const title = section.content?.title || section.content?.eyebrow || "بدون عنوان";
  return `${t ? `${t.icon} ${t.label}` : "قسم"} — ${title}`;
}

// ---------------------------------------------------------------------------
// محرر عناصر متكرّرة (items) — شكل الحقول بيتغيّر حسب نوع القسم
// ---------------------------------------------------------------------------
function ItemsEditor({ mode, items, onChange }) {
  const list = Array.isArray(items) ? items : [];

  function update(i, patch) {
    const next = list.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  }
  function add() {
    onChange([...list, {}]);
  }
  function remove(i) {
    onChange(list.filter((_, idx) => idx !== i));
  }

  const showTag = mode === "tips";
  const showDesc = mode === "tips" || mode === "why" || mode === "process";
  const iconLabel = mode === "stats" ? "الرقم" : "الأيقونة (إيموجي)";
  const titleLabel = mode === "stats" || mode === "case" ? "النص" : "العنوان";

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>العناصر ({list.length})</label>
      {list.map((it, i) => (
        <div key={i} style={{ border: "1px solid rgba(201,150,58,0.15)", borderRadius: 10, padding: 10, marginBottom: 8, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {mode !== "stats" && (
              <input
                style={{ ...fieldStyle, marginBottom: 8, width: 70, textAlign: "center" }}
                placeholder={iconLabel}
                value={mode === "stats" ? "" : it.icon || ""}
                onChange={(e) => update(i, { icon: e.target.value })}
              />
            )}
            <input
              style={{ ...fieldStyle, marginBottom: 8, flex: 1 }}
              placeholder={titleLabel}
              value={it.title || ""}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              style={{ background: "none", border: "1px solid rgba(255,80,80,0.4)", color: "#ff8080", borderRadius: 8, padding: "0 12px", fontSize: 12, cursor: "pointer" }}
            >
              حذف
            </button>
          </div>
          {mode === "stats" && (
            <input
              style={{ ...fieldStyle, marginBottom: 0 }}
              placeholder="الوصف (تحت الرقم)"
              value={it.desc || ""}
              onChange={(e) => update(i, { desc: e.target.value })}
            />
          )}
          {showDesc && (
            <textarea
              style={{ ...fieldStyle, marginBottom: showTag ? 8 : 0, minHeight: 50, resize: "vertical" }}
              placeholder="الوصف"
              value={it.desc || ""}
              onChange={(e) => update(i, { desc: e.target.value })}
            />
          )}
          {showTag && (
            <input
              style={{ ...fieldStyle, marginBottom: 0 }}
              placeholder="الوسم (Tag)، مثال: AUDIENCE FIRST"
              value={it.tag || ""}
              onChange={(e) => update(i, { tag: e.target.value })}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{ background: "rgba(201,150,58,0.08)", border: `1px dashed ${GOLD}`, color: GOLD, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }}
      >
        + إضافة عنصر
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// محرر الأزرار
// ---------------------------------------------------------------------------
function ButtonsEditor({ buttons, onChange }) {
  const list = Array.isArray(buttons) ? buttons : [];
  function update(i, patch) {
    onChange(list.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function add() {
    onChange([...list, { label: "", url: "" }]);
  }
  function remove(i) {
    onChange(list.filter((_, idx) => idx !== i));
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>الأزرار ({list.length})</label>
      {list.map((b, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} placeholder="نص الزر" value={b.label || ""} onChange={(e) => update(i, { label: e.target.value })} />
          <input style={{ ...fieldStyle, marginBottom: 0, flex: 1 }} dir="ltr" placeholder="الرابط (URL)" value={b.url || ""} onChange={(e) => update(i, { url: e.target.value })} />
          <button type="button" onClick={() => remove(i)} style={{ background: "none", border: "1px solid rgba(255,80,80,0.4)", color: "#ff8080", borderRadius: 8, padding: "0 12px", fontSize: 12, cursor: "pointer" }}>
            حذف
          </button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ background: "rgba(201,150,58,0.08)", border: `1px dashed ${GOLD}`, color: GOLD, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }}>
        + إضافة زر
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal تعديل قسم
// ---------------------------------------------------------------------------
function SectionEditModal({ section, onClose, onSaved, flash }) {
  const layout = layoutFor(section);
  const [content, setContent] = useState(section.content || {});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  async function handleImageUpload(file) {
    setUploading(true);
    try {
      const url = await uploadHomepageImage(file);
      set("image_url", url);
    } catch (e) {
      flash("❌ فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateHomepageSectionContent(section.id, content);
      flash("✅ تم حفظ التعديلات");
      onSaved();
      onClose();
    } catch (e) {
      flash("❌ حصل خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} dir="rtl">
      <div style={{ background: "#141414", border: "1px solid rgba(201,150,58,0.25)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
        <h3 style={{ color: GOLD, fontWeight: 900, fontSize: 16, marginBottom: 16 }}>تعديل: {sectionDisplayName(section)}</h3>

        {layout.eyebrow && (
          <>
            <label style={labelStyle}>الشارة العلوية الصغيرة (Eyebrow)</label>
            <input style={fieldStyle} value={content.eyebrow || ""} onChange={(e) => set("eyebrow", e.target.value)} />
          </>
        )}
        {layout.badge_text && (
          <>
            <label style={labelStyle}>نص الشارة (مثال: خصم 20%)</label>
            <input style={fieldStyle} value={content.badge_text || ""} onChange={(e) => set("badge_text", e.target.value)} />
          </>
        )}
        {layout.title && (
          <>
            <label style={labelStyle}>العنوان</label>
            <input style={fieldStyle} value={content.title || ""} onChange={(e) => set("title", e.target.value)} />
          </>
        )}
        {layout.client_name && (
          <>
            <label style={labelStyle}>اسم العميل</label>
            <input style={fieldStyle} value={content.client_name || ""} onChange={(e) => set("client_name", e.target.value)} />
          </>
        )}
        {layout.subtitle && (
          <>
            <label style={labelStyle}>النص الفرعي</label>
            <textarea style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} value={content.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} />
          </>
        )}
        {layout.body && (
          <>
            <label style={labelStyle}>النص التفصيلي</label>
            <textarea style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }} value={content.body || ""} onChange={(e) => set("body", e.target.value)} />
          </>
        )}
        {layout.sub_label && (
          <>
            <label style={labelStyle}>وصف صغير إضافي</label>
            <input style={fieldStyle} value={content.sub_label || ""} onChange={(e) => set("sub_label", e.target.value)} />
          </>
        )}
        {layout.image && (
          <>
            <label style={labelStyle}>الصورة {uploading && "(جاري الرفع...)"}</label>
            <div style={{ marginBottom: 10 }}>
              <ImageDropzone previewUrl={content.image_url} onFileSelected={handleImageUpload} height={140} />
            </div>
          </>
        )}
        {layout.items && <ItemsEditor mode={layout.items} items={content.items} onChange={(items) => set("items", items)} />}
        {layout.buttons && <ButtonsEditor buttons={content.buttons} onChange={(buttons) => set("buttons", buttons)} />}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ flex: 1, background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: "#000", fontWeight: 900, border: "none", borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ"}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal اختيار نوع القسم الجديد
// ---------------------------------------------------------------------------
function NewSectionTypeModal({ onClose, onPick }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} dir="rtl">
      <div style={{ background: "#141414", border: "1px solid rgba(201,150,58,0.25)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
        <h3 style={{ color: GOLD, fontWeight: 900, fontSize: 16, marginBottom: 16 }}>نوع القسم الجديد</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(CUSTOM_SECTION_TYPES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => onPick(key)}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,150,58,0.2)", borderRadius: 12, padding: "16px 10px", color: "#fff", cursor: "pointer", textAlign: "center" }}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 10, padding: "10px", fontSize: 13, cursor: "pointer" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------
export default function HomepageSectionsManager() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [pickingType, setPickingType] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllHomepageSections();
      setSections(data);
    } catch (e) {
      flash("❌ فشل تحميل أقسام الصفحة الرئيسية");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDrop(targetIdx) {
    if (dragIndex === null || dragIndex === targetIdx) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIdx, 0, moved);
    setSections(reordered);
    setDragIndex(null);
    const withOrders = reordered.map((s, i) => ({ id: s.id, sort_order: i }));
    try {
      await reorderHomepageSections(withOrders);
      flash("↕️ تم حفظ الترتيب الجديد");
    } catch (e) {
      flash("❌ فشل حفظ الترتيب");
      load();
    }
  }

  async function toggleVisibility(section) {
    try {
      await setHomepageSectionVisibility(section.id, !section.is_visible);
      setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, is_visible: !s.is_visible } : s)));
      flash(section.is_visible ? "🙈 تم إخفاء القسم" : "👁️ تم إظهار القسم");
    } catch (e) {
      flash("❌ فشلت العملية");
    }
  }

  async function handleDelete(section) {
    if (!window.confirm("متأكد إنك عايز تحذف القسم ده نهائيًا؟")) return;
    try {
      await deleteHomepageSection(section.id);
      setSections((prev) => prev.filter((s) => s.id !== section.id));
      flash("🗑️ تم حذف القسم");
    } catch (e) {
      flash("❌ فشل الحذف");
    }
  }

  async function handlePickType(custom_type) {
    setPickingType(false);
    try {
      const maxOrder = sections.length ? Math.max(...sections.map((s) => s.sort_order)) : 0;
      const created = await createHomepageSection({
        custom_type,
        content: { title: "", subtitle: "" },
        sort_order: maxOrder + 1,
      });
      setSections((prev) => [...prev, created]);
      setEditing(created);
      flash("✅ تم إضافة القسم — عدّل محتواه دلوقتي");
    } catch (e) {
      flash("❌ فشلت إضافة القسم");
    }
  }

  if (loading) {
    return <div style={{ color: "#999", padding: 30, textAlign: "center" }}>جاري تحميل أقسام الصفحة الرئيسية...</div>;
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 18, marginBottom: 4 }}>🏠 إدارة الصفحة الرئيسية</h2>
          <p style={{ color: "#777", fontSize: 12 }}>اسحب الأقسام لإعادة ترتيبها، اضغط على أي قسم لتعديل نصه وصوره وأزراره، أو أضف قسم جديد (بانر/عرض/خصم/إعلان).</p>
        </div>
        <button
          onClick={() => setPickingType(true)}
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: "#000", fontWeight: 900, border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          + إضافة قسم جديد
        </button>
      </div>

      <div>
        {sections.map((section, idx) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${section.is_visible ? "rgba(201,150,58,0.2)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 8,
              opacity: section.is_visible ? 1 : 0.55,
              cursor: "grab",
            }}
          >
            <span style={{ color: "#666", fontSize: 16, cursor: "grab" }}>⠿⠿</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 6,
                background: section.kind === "core" ? "rgba(110,231,247,0.1)" : "rgba(201,150,58,0.12)",
                color: section.kind === "core" ? "#6ee7f7" : GOLD,
                whiteSpace: "nowrap",
              }}
            >
              {section.kind === "core" ? "أساسي" : CUSTOM_SECTION_TYPES[section.custom_type]?.label || "مخصص"}
            </span>
            <span style={{ flex: 1, color: "#fff", fontSize: 13, fontWeight: 700 }}>{sectionDisplayName(section)}</span>
            <button
              onClick={() => toggleVisibility(section)}
              title={section.is_visible ? "إخفاء" : "إظهار"}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#ccc", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
            >
              {section.is_visible ? "👁️ ظاهر" : "🙈 مخفي"}
            </button>
            <button
              onClick={() => setEditing(section)}
              style={{ background: "rgba(201,150,58,0.1)", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ✏️ تعديل
            </button>
            {section.kind === "custom" && (
              <button
                onClick={() => handleDelete(section)}
                style={{ background: "none", border: "1px solid rgba(255,80,80,0.35)", color: "#ff8080", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              >
                حذف
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && <SectionEditModal section={editing} onClose={() => setEditing(null)} onSaved={load} flash={flash} />}
      {pickingType && <NewSectionTypeModal onClose={() => setPickingType(false)} onPick={handlePickType} />}
      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}
