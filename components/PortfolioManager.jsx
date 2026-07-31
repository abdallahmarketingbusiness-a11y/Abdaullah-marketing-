// src/components/PortfolioManager.jsx
import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { PORTFOLIO_STATUS, DEFAULT_CATEGORIES } from "../config/portfolioConfig";
import {
  fetchAllPortfolioItemsForAdmin,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  setPortfolioStatus,
  setPortfolioFeatured,
  reorderPortfolioItems,
  duplicatePortfolioItem,
  bulkDeletePortfolioItems,
  bulkSetStatus,
  fetchPortfolioImages,
  addPortfolioImage,
  deletePortfolioImage,
  fetchPortfolioSourceFiles,
  addPortfolioSourceFile,
  deletePortfolioSourceFile,
  uploadPortfolioImage,
  uploadPortfolioSourceFile,
} from "../services/portfolioService";
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

function statusLabel(status) {
  if (status === PORTFOLIO_STATUS.PUBLISHED) return "👁️ منشور";
  if (status === PORTFOLIO_STATUS.HIDDEN) return "🙈 مخفي";
  return "📝 مسودة";
}

function isNew(createdAt) {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return days <= 14;
}

// ---------------------------------------------------------------------------
// Modal الإضافة / التعديل
// ---------------------------------------------------------------------------
function PortfolioFormModal({ item, categories, onClose, onSaved, flash }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    title: item?.title || "",
    short_description: item?.short_description || "",
    full_description: item?.full_description || "",
    category: item?.category || categories[0] || DEFAULT_CATEGORIES[0],
    customCategory: "",
    client_name: item?.client_name || "",
    execution_date: item?.execution_date || "",
    video_url: item?.video_url || "",
    status: item?.status || PORTFOLIO_STATUS.DRAFT,
    is_featured: item?.is_featured || false,
    main_image_url: item?.main_image_url || "",
  });
  const [mainImageFile, setMainImageFile] = useState(null);
  const [gallery, setGallery] = useState([]); // {id?, image_url, file?, isNew}
  const [sourceFiles, setSourceFiles] = useState([]);
  const [newSourceFile, setNewSourceFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const imgs = await fetchPortfolioImages(item.id);
      setGallery(imgs.map((i) => ({ id: i.id, image_url: i.image_url })));
      const files = await fetchPortfolioSourceFiles(item.id);
      setSourceFiles(files);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAddGalleryFile(file) {
    setGallery((g) => [...g, { file, image_url: URL.createObjectURL(file), isNew: true }]);
  }

  async function handleSave() {
    if (form.title.trim().length < 3) {
      setError("عنوان التصميم لازم يكون 3 حروف على الأقل.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let mainImageUrl = form.main_image_url;
      if (mainImageFile) {
        mainImageUrl = await uploadPortfolioImage(mainImageFile);
      }

      const finalCategory = form.customCategory.trim() || form.category;

      const payload = {
        title: form.title.trim(),
        short_description: form.short_description,
        full_description: form.full_description,
        category: finalCategory,
        client_name: form.client_name,
        execution_date: form.execution_date || null,
        video_url: form.video_url,
        status: form.status,
        is_featured: form.is_featured,
        main_image_url: mainImageUrl,
      };

      let saved;
      if (isEdit) {
        saved = await updatePortfolioItem(item.id, payload);
      } else {
        saved = await createPortfolioItem(payload);
      }

      // ارفع أي صور جاليري جديدة واحفظها
      for (const g of gallery) {
        if (g.isNew && g.file) {
          const url = await uploadPortfolioImage(g.file);
          await addPortfolioImage(saved.id, url);
        }
      }

      // ملف مصدر جديد (PSD/AI/PDF)
      if (newSourceFile) {
        const path = await uploadPortfolioSourceFile(newSourceFile);
        await addPortfolioSourceFile(saved.id, path, newSourceFile.name);
      }

      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم إضافة العمل");
      onSaved();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveGalleryImage(g, idx) {
    if (g.id) {
      await deletePortfolioImage(g.id);
    }
    setGallery((list) => list.filter((_, i) => i !== idx));
  }

  async function handleRemoveSourceFile(fileId) {
    await deletePortfolioSourceFile(fileId);
    setSourceFiles((list) => list.filter((f) => f.id !== fileId));
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200,
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto",
      }}
    >
      <div
        dir="rtl"
        style={{
          width: "100%", maxWidth: 640, background: "#0c0c0c",
          border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 40, marginBottom: 40,
        }}
      >
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 16, fontSize: 18 }}>
          {isEdit ? "✏️ تعديل عمل" : "➕ إضافة عمل جديد"}
        </h3>

        <label style={labelStyle}>عنوان التصميم</label>
        <input style={fieldStyle} value={form.title} onChange={(e) => update("title", e.target.value)} />

        <label style={labelStyle}>وصف مختصر</label>
        <input style={fieldStyle} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} />

        <label style={labelStyle}>الوصف الكامل</label>
        <textarea
          rows={4}
          style={{ ...fieldStyle, resize: "vertical" }}
          value={form.full_description}
          onChange={(e) => update("full_description", e.target.value)}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>التصنيف</label>
            <select style={fieldStyle} value={form.category} onChange={(e) => update("category", e.target.value)}>
              {[...new Set([...categories, ...DEFAULT_CATEGORIES])].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>أو تصنيف جديد</label>
            <input style={fieldStyle} placeholder="اكتب تصنيف جديد" value={form.customCategory} onChange={(e) => update("customCategory", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>العميل (اختياري)</label>
            <input style={fieldStyle} value={form.client_name} onChange={(e) => update("client_name", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>تاريخ التنفيذ</label>
            <input type="date" style={fieldStyle} value={form.execution_date || ""} onChange={(e) => update("execution_date", e.target.value)} />
          </div>
        </div>

        <label style={labelStyle}>رابط فيديو قصير (اختياري)</label>
        <input style={fieldStyle} value={form.video_url} onChange={(e) => update("video_url", e.target.value)} placeholder="https://..." />

        <label style={labelStyle}>الصورة الرئيسية</label>
        <ImageDropzone
          previewUrl={form.main_image_url}
          onFileSelected={(file) => setMainImageFile(file)}
        />

        <label style={{ ...labelStyle, marginTop: 14 }}>صور إضافية (Gallery)</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
          {gallery.map((g, idx) => (
            <div key={idx} style={{ position: "relative", height: 70, borderRadius: 8, overflow: "hidden" }}>
              <img src={g.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => handleRemoveGalleryImage(g, idx)}
                style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,0.7)", color: "#ff8080", border: "none", borderRadius: 6, width: 20, height: 20, cursor: "pointer", fontSize: 12 }}
              >×</button>
            </div>
          ))}
          <ImageDropzone height={70} label="+ إضافة" onFileSelected={handleAddGalleryFile} />
        </div>

        <label style={{ ...labelStyle, marginTop: 6 }}>ملفات المشروع الداخلية (PSD / AI / PDF)</label>
        <input
          type="file"
          accept=".psd,.ai,.pdf"
          onChange={(e) => setNewSourceFile(e.target.files?.[0] || null)}
          style={{ ...fieldStyle, padding: "8px 10px" }}
        />
        {sourceFiles.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {sourceFiles.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", color: "#aaa", fontSize: 12, padding: "4px 0" }}>
                <span>📎 {f.file_name}</span>
                <button onClick={() => handleRemoveSourceFile(f.id)} style={{ background: "none", border: "none", color: "#ff8080", cursor: "pointer" }}>حذف</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>حالة النشر</label>
            <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value={PORTFOLIO_STATUS.DRAFT}>📝 مسودة</option>
              <option value={PORTFOLIO_STATUS.PUBLISHED}>👁️ منشور</option>
              <option value={PORTFOLIO_STATUS.HIDDEN}>🙈 مخفي</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#ddd", fontSize: 13, marginTop: 18 }}>
            <input type="checkbox" checked={form.is_featured} onChange={(e) => update("is_featured", e.target.checked)} />
            ⭐ تمييز في الصفحة الرئيسية
          </label>
        </div>

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>
            إلغاء
          </button>
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

// ---------------------------------------------------------------------------
// المكوّن الرئيسي
// ---------------------------------------------------------------------------
export default function PortfolioManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // null | {} (new) | item (edit)
  const [toastMsg, setToastMsg] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllPortfolioItemsForAdmin({ search, category });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce بسيط للبحث
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))), [items]);

  function toggleSelect(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete(item) {
    if (!window.confirm(`تأكيد حذف "${item.title}"؟ لا يمكن التراجع.`)) return;
    await deletePortfolioItem(item.id);
    setItems((list) => list.filter((p) => p.id !== item.id));
    flash("🗑️ تم الحذف");
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`تأكيد حذف ${selected.size} عنصر؟ لا يمكن التراجع.`)) return;
    await bulkDeletePortfolioItems(Array.from(selected));
    setItems((list) => list.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    flash("🗑️ تم الحذف الجماعي");
  }

  async function handleBulkPublish() {
    if (selected.size === 0) return;
    await bulkSetStatus(Array.from(selected), PORTFOLIO_STATUS.PUBLISHED);
    await load();
    setSelected(new Set());
    flash("📢 تم النشر الجماعي");
  }

  async function handleToggleVisibility(item) {
    const next = item.status === PORTFOLIO_STATUS.HIDDEN ? PORTFOLIO_STATUS.PUBLISHED : PORTFOLIO_STATUS.HIDDEN;
    const updated = await setPortfolioStatus(item.id, next);
    setItems((list) => list.map((p) => (p.id === item.id ? updated : p)));
  }

  async function handleToggleFeatured(item) {
    const updated = await setPortfolioFeatured(item.id, !item.is_featured);
    setItems((list) => list.map((p) => (p.id === item.id ? updated : p)));
  }

  async function handleDuplicate(item) {
    const copy = await duplicatePortfolioItem(item.id);
    setItems((list) => [copy, ...list]);
    flash("📄 تم إنشاء نسخة كمسودة");
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
    const withOrders = reordered.map((it, i) => ({ id: it.id, sort_order: i }));
    await reorderPortfolioItems(withOrders);
  }

  return (
    <div dir="rtl">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <input
          placeholder="🔍 بحث بالعنوان أو العميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 0, maxWidth: 260 }}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...fieldStyle, marginBottom: 0, maxWidth: 200 }}>
          <option value="all">كل التصنيفات</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setEditing({})}
          style={{ marginRight: "auto", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
        >
          ➕ عمل جديد
        </button>
      </div>

      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <span style={{ color: GOLD3, fontSize: 13 }}>{selected.size} محدد</span>
          <ActionBtn onClick={handleBulkPublish}>📢 نشر الكل</ActionBtn>
          <ActionBtn danger onClick={handleBulkDelete}>🗑️ حذف الكل</ActionBtn>
          <ActionBtn onClick={() => setSelected(new Set())}>إلغاء التحديد</ActionBtn>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد أعمال حتى الآن.</p>
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
                borderRadius: 16,
                border: `1px solid ${item.is_featured ? "rgba(201,150,58,0.5)" : "rgba(255,255,255,0.08)"}`,
                background: "rgba(255,255,255,0.02)",
                padding: 14,
                opacity: item.status === PORTFOLIO_STATUS.HIDDEN ? 0.55 : 1,
                cursor: "grab",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ marginTop: 4 }} />
                {item.main_image_url && (
                  <img src={item.main_image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</h3>
                    <span style={{ fontSize: 10.5, color: GOLD3, whiteSpace: "nowrap" }}>{statusLabel(item.status)}</span>
                  </div>
                  <p style={{ color: "#888", fontSize: 11.5, margin: "4px 0" }}>{item.category}{item.client_name ? ` · ${item.client_name}` : ""}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {isNew(item.created_at) && <span style={badgeStyle("#3fa9f5")}>جديد</span>}
                    {item.is_featured && <span style={badgeStyle(GOLD)}>مميز</span>}
                    <span style={badgeStyle("#666")}>👁️ {item.views_count || 0}</span>
                    <span style={badgeStyle("#666")}>📩 {item.requests_count || 0}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <ActionBtn onClick={() => setEditing(item)}>✏️ تعديل</ActionBtn>
                <ActionBtn onClick={() => handleDuplicate(item)}>📄 نسخ</ActionBtn>
                <ActionBtn onClick={() => handleToggleFeatured(item)}>⭐ {item.is_featured ? "إلغاء التمييز" : "تمييز"}</ActionBtn>
                <ActionBtn onClick={() => handleToggleVisibility(item)}>👁️ {item.status === PORTFOLIO_STATUS.HIDDEN ? "إظهار" : "إخفاء"}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(item)}>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <PortfolioFormModal
          item={editing.id ? editing : null}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          flash={flash}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}

function badgeStyle(color) {
  return {
    fontSize: 10, fontWeight: 800, color, border: `1px solid ${color}55`,
    borderRadius: 6, padding: "2px 6px",
  };
}
