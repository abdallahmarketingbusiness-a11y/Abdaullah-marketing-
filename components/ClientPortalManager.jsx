// src/components/ClientPortalManager.jsx
//
// لوحة "بيانات لوحة العميل" داخل السوبر أدمن: اختار عميل، اختار قسم (حالة
// الاشتراك / الأداء / الحملات / التقارير / الملفات / السكربتات / الملاحظات /
// الفواتير / الإشعارات)، وضيف/عدّل/احذف/انشر الصفوف بتاعته. نفس فكرة
// AnalyticsManager.jsx لكن مبنية بشكل عام (Generic) يشتغل على كل الأقسام.

import { useEffect, useRef, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { PORTAL_SECTIONS, emptyFormFromFields } from "../config/clientPortalConfig";
import { fetchAllClientsForAdmin } from "../services/clientAuthService";
import {
  fetchSectionRowsForAdmin,
  createSectionRow,
  updateSectionRow,
  deleteSectionRow,
  setSectionRowPublished,
  uploadClientFile,
} from "../services/clientPortalAdminService";
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
  fontFamily: FONT,
  boxSizing: "border-box",
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

function FieldInput({ field, value, onChange }) {
  if (field.type === "textarea") {
    return <textarea rows={4} style={{ ...fieldStyle, resize: "vertical" }} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "select") {
    return (
      <select style={fieldStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  if (field.type === "number") {
    return <input type="number" style={fieldStyle} value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
  }
  if (field.type === "date") {
    return <input type="date" style={fieldStyle} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "checkbox") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#ddd", fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return <input style={fieldStyle} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function FileUploadField({ form, update }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url, sizeLabel, guessedType } = await uploadClientFile(file);
      update("file_url", url);
      update("size_label", sizeLabel);
      update("file_type", guessedType);
      if (!form.name?.trim()) update("name", file.name);
    } catch (e) {
      setError(e.message || "فشل رفع الملف. تأكد إنك نفّذت sql/migration_client_portal.sql (وأنشأت bucket باسم client-files).");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>📤 ارفع الملف مباشرة (اختياري)</label>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${uploading ? GOLD : "rgba(201,150,58,0.35)"}`,
          borderRadius: 12, padding: "16px 12px", textAlign: "center",
          cursor: "pointer", background: "rgba(255,255,255,0.02)",
        }}
      >
        <span style={{ color: GOLD3, fontSize: 12.5 }}>
          {uploading ? "⏳ جاري الرفع..." : form.file_url ? "✅ تم الرفع — اضغط لتغيير الملف" : "اضغط لاختيار ملف من جهازك (PDF, صورة, فيديو, إكسل...)"}
        </span>
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p style={{ color: "#ff8080", fontSize: 11.5, marginTop: 6 }}>{error}</p>}
      <p style={{ color: "#777", fontSize: 11, marginTop: 6 }}>
        أو سيب الحقول تحت فاضية واكتب رابط جاهز يدويًا في "رابط التحميل".
      </p>
    </div>
  );
}

function RowFormModal({ section, clientId, item, onClose, onSaved, flash }) {
  const isEdit = !!item;
  const [form, setForm] = useState(() => emptyFormFromFields(section.fields, item || {}));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (isEdit) await updateSectionRow(section.key, item.id, form);
      else await createSectionRow(section.key, clientId, form);
      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم الإضافة");
      onSaved();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ. (تأكد إنك نفّذت sql/migration_client_portal.sql)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 520, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 30, marginBottom: 30 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 18, fontSize: 18 }}>
          {isEdit ? `✏️ تعديل — ${section.label}` : `➕ إضافة — ${section.label}`}
        </h3>

        {section.key === "files" && <FileUploadField form={form} update={update} />}

        {section.fields.map((f) =>
          f.type === "checkbox" ? (
            <FieldInput key={f.key} field={f} value={form[f.key]} onChange={(v) => update(f.key, v)} />
          ) : (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <FieldInput field={f} value={form[f.key]} onChange={(v) => update(f.key, v)} />
            </div>
          )
        )}

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalManager() {
  const [sectionKey, setSectionKey] = useState(PORTAL_SECTIONS[0].key);
  const section = PORTAL_SECTIONS.find((s) => s.key === sectionKey);

  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  function flash(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }

  useEffect(() => {
    setLoadingClients(true);
    const t = setTimeout(() => {
      fetchAllClientsForAdmin({ search: clientSearch })
        .then(setClients)
        .catch(() => setClients([]))
        .finally(() => setLoadingClients(false));
    }, 250);
    return () => clearTimeout(t);
  }, [clientSearch]);

  async function loadRows(clientId, key) {
    setLoadingRows(true);
    try {
      const data = await fetchSectionRowsForAdmin(key, clientId);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    if (selectedClient) loadRows(selectedClient.user_id, sectionKey);
  }, [sectionKey]);

  function selectClient(client) {
    setSelectedClient(client);
    loadRows(client.user_id, sectionKey);
  }

  async function handleDelete(row) {
    if (!window.confirm("تأكيد الحذف؟ لا يمكن التراجع.")) return;
    await deleteSectionRow(sectionKey, row.id);
    setRows((list) => list.filter((r) => r.id !== row.id));
    flash("🗑️ تم الحذف");
  }

  async function handleTogglePublish(row) {
    const updated = await setSectionRowPublished(sectionKey, row.id, !row.is_published);
    setRows((list) => list.map((r) => (r.id === row.id ? updated : r)));
  }

  return (
    <div dir="rtl">
      <p style={{ color: "#888", fontSize: 12.5, marginBottom: 14 }}>
        اختار قسم من الأقسام تحت، بعدين اختار عميل، وضيف/عدّل بياناته. الصفوف "منشورة" فقط تظهر في لوحة العميل.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {PORTAL_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSectionKey(s.key)}
            style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${sectionKey === s.key ? GOLD : "rgba(255,255,255,0.1)"}`,
              background: sectionKey === s.key ? "rgba(201,150,58,0.12)" : "none",
              color: sectionKey === s.key ? GOLD3 : "#aaa",
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 20 }}>
        {/* عمود اختيار العميل */}
        <div>
          <input
            placeholder="🔍 بحث بالاسم أو النشاط..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            style={{ ...fieldStyle, marginBottom: 12 }}
          />
          {loadingClients ? (
            <p style={{ color: "#888", fontSize: 12.5 }}>جاري التحميل...</p>
          ) : clients.length === 0 ? (
            <p style={{ color: "#888", fontSize: 12.5 }}>لا يوجد عملاء مسجّلين حتى الآن.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 460, overflowY: "auto" }}>
              {clients.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => selectClient(c)}
                  style={{
                    textAlign: "right", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${selectedClient?.user_id === c.user_id ? GOLD : "rgba(255,255,255,0.08)"}`,
                    background: selectedClient?.user_id === c.user_id ? "rgba(201,150,58,0.1)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{c.full_name || "بدون اسم"}</div>
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{c.business_name || "—"}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* عمود الصفوف */}
        <div style={{ gridColumn: "span 2 / span 2" }}>
          {!selectedClient ? (
            <div style={{ textAlign: "center", padding: "40px 16px", border: "1px dashed rgba(201,150,58,0.3)", borderRadius: 14, color: "#888", fontSize: 13 }}>
              اختار عميل من القائمة الجانبية عشان تشوف/تضيف بياناته في قسم "{section.label}".
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  {section.icon} {section.label}: {selectedClient.full_name || selectedClient.business_name || "عميل"}
                </h3>
                <button
                  onClick={() => setEditing({})}
                  style={{ padding: "9px 16px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
                >
                  ➕ إضافة
                </button>
              </div>

              {loadingRows ? (
                <p style={{ color: "#888" }}>جاري التحميل...</p>
              ) : rows.length === 0 ? (
                <p style={{ color: "#888" }}>لا توجد بيانات لهذا العميل في هذا القسم بعد.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
                        borderRadius: 14, padding: 16, opacity: row.is_published ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ color: "#fff", fontWeight: 800, fontSize: 14, wordBreak: "break-word" }}>
                            {String(row[section.titleField] || "").slice(0, 80) || "—"}
                          </h4>
                          <p style={{ color: "#888", fontSize: 11, marginTop: 3 }}>
                            {row.is_published ? "👁️ منشور للعميل" : "📝 مخفي (مسودة)"}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                        <ActionBtn onClick={() => setEditing(row)}>✏️ تعديل</ActionBtn>
                        <ActionBtn onClick={() => handleTogglePublish(row)}>
                          {row.is_published ? "📝 إخفاء عن العميل" : "👁️ نشر للعميل"}
                        </ActionBtn>
                        <ActionBtn danger onClick={() => handleDelete(row)}>🗑️ حذف</ActionBtn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editing !== null && selectedClient && (
        <RowFormModal
          section={section}
          clientId={selectedClient.user_id}
          item={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadRows(selectedClient.user_id, sectionKey); }}
          flash={flash}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}
