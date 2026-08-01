// src/components/AnalyticsManager.jsx
//
// لوحة "تحليلات العملاء" داخل السوبر أدمن: اختار عميل، شوف تقارير التحليلات
// الشهرية بتاعته، وضيف/عدّل/احذف تقرير (الوصول، التفاعل، المتابعين، الزيارات،
// أفضل/أسوأ المنشورات، نقاط القوة والضعف، اقتراحات الشهر القادم).

import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import { ANALYTICS_STATUS, monthKeyToLabel, emptyPostItem } from "../config/analyticsConfig";
import { fetchAllClientsForAdmin } from "../services/clientAuthService";
import {
  fetchClientAnalyticsForAdmin,
  createAnalyticsSnapshot,
  updateAnalyticsSnapshot,
  deleteAnalyticsSnapshot,
  setAnalyticsStatus,
} from "../services/analyticsService";
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

function todayMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// محرر قائمة نصية (نقاط قوة / ضعف / اقتراحات) — سطر لكل عنصر
// ----------------------------------------------------------------------------
function TextListField({ label, icon, value, onChange, placeholder }) {
  const text = (value || []).join("\n");
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{icon} {label} <span style={{ color: "#777", fontWeight: 400 }}>(سطر لكل نقطة)</span></label>
      <textarea
        rows={4}
        style={{ ...fieldStyle, resize: "vertical" }}
        value={text}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// محرر قائمة منشورات (عنوان + منصة + مؤشر) — صفوف قابلة للإضافة/الحذف
// ----------------------------------------------------------------------------
function PostsListField({ label, icon, items, onChange }) {
  const list = items && items.length > 0 ? items : [emptyPostItem()];

  function updateRow(i, field, val) {
    const next = list.map((row, idx) => (idx === i ? { ...row, [field]: val } : row));
    onChange(next);
  }
  function addRow() {
    onChange([...list, emptyPostItem()]);
  }
  function removeRow(i) {
    onChange(list.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{icon} {label}</label>
      {list.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <input
            style={{ ...fieldStyle, marginBottom: 0, flex: "2 1 140px" }}
            placeholder="عنوان المنشور"
            value={row.title}
            onChange={(e) => updateRow(i, "title", e.target.value)}
          />
          <input
            style={{ ...fieldStyle, marginBottom: 0, flex: "1 1 90px" }}
            placeholder="المنصة"
            value={row.platform}
            onChange={(e) => updateRow(i, "platform", e.target.value)}
          />
          <input
            style={{ ...fieldStyle, marginBottom: 0, flex: "1 1 90px" }}
            placeholder="مثال: 9,200 مشاهدة"
            value={row.metric}
            onChange={(e) => updateRow(i, "metric", e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            style={{ border: "1px solid rgba(255,80,80,0.35)", background: "none", color: "#ff8080", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        style={{ border: "1px dashed rgba(201,150,58,0.4)", background: "none", color: GOLD3, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
      >
        ➕ إضافة منشور
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// نموذج إضافة/تعديل تقرير تحليلات
// ----------------------------------------------------------------------------
function AnalyticsFormModal({ clientId, item, onClose, onSaved, flash }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    period_month: item?.period_month ? item.period_month.slice(0, 7) : todayMonthValue(),
    period_label: item?.period_label || "",
    reach: item?.reach ?? 0,
    impressions: item?.impressions ?? 0,
    engagement_rate: item?.engagement_rate ?? 0,
    profile_visits: item?.profile_visits ?? 0,
    followers_count: item?.followers_count ?? 0,
    followers_growth: item?.followers_growth ?? 0,
    best_posts: item?.best_posts?.length ? item.best_posts : [emptyPostItem()],
    worst_posts: item?.worst_posts?.length ? item.worst_posts : [emptyPostItem()],
    strengths: item?.strengths || [],
    weaknesses: item?.weaknesses || [],
    suggestions: item?.suggestions || [],
    status: item?.status || ANALYTICS_STATUS.PUBLISHED,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.period_month) {
      setError("لازم تحدد الشهر.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        client_id: clientId,
        period_month: `${form.period_month}-01`,
        period_label: form.period_label?.trim() || monthKeyToLabel(form.period_month),
      };
      if (isEdit) await updateAnalyticsSnapshot(item.id, payload);
      else await createAnalyticsSnapshot(payload);

      flash(isEdit ? "✅ تم حفظ التعديلات" : "✅ تم إضافة التقرير");
      onSaved();
    } catch (e) {
      setError(e.message || "حدث خطأ أثناء الحفظ. (تأكد إنك نفّذت sql/migration_analytics.sql)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 620, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 30, marginBottom: 30 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 18, fontSize: 18 }}>
          {isEdit ? "✏️ تعديل تقرير تحليلات" : "➕ تقرير تحليلات جديد"}
        </h3>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>الشهر</label>
            <input type="month" style={fieldStyle} value={form.period_month} onChange={(e) => update("period_month", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>عنوان الفترة (اختياري)</label>
            <input style={fieldStyle} placeholder={monthKeyToLabel(form.period_month)} value={form.period_label} onChange={(e) => update("period_label", e.target.value)} />
          </div>
        </div>

        <h4 style={{ color: GOLD3, fontSize: 13, fontWeight: 800, margin: "6px 0 12px" }}>📊 الأرقام الأساسية</h4>
        <div className="grid grid-cols-2" style={{ gap: 10 }}>
          <NumberField label="👁️ الوصول" value={form.reach} onChange={(v) => update("reach", v)} />
          <NumberField label="📈 مرات الظهور" value={form.impressions} onChange={(v) => update("impressions", v)} />
          <NumberField label="💬 نسبة التفاعل %" value={form.engagement_rate} onChange={(v) => update("engagement_rate", v)} step="0.1" />
          <NumberField label="🌐 زيارات الحساب" value={form.profile_visits} onChange={(v) => update("profile_visits", v)} />
          <NumberField label="👥 عدد المتابعين" value={form.followers_count} onChange={(v) => update("followers_count", v)} />
          <NumberField label="📶 نمو المتابعين (صافي)" value={form.followers_growth} onChange={(v) => update("followers_growth", v)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <PostsListField label="أفضل المنشورات" icon="🏆" items={form.best_posts} onChange={(v) => update("best_posts", v)} />
          <PostsListField label="أسوأ المنشورات" icon="📉" items={form.worst_posts} onChange={(v) => update("worst_posts", v)} />
          <TextListField label="نقاط القوة" icon="💪" value={form.strengths} onChange={(v) => update("strengths", v)} placeholder="مثال: تحسن ملحوظ في نسبة التفاعل" />
          <TextListField label="نقاط الضعف" icon="⚠️" value={form.weaknesses} onChange={(v) => update("weaknesses", v)} placeholder="مثال: تراجع طفيف في عدد المشاهدات على تيك توك" />
          <TextListField label="اقتراحات الشهر القادم" icon="💡" value={form.suggestions} onChange={(v) => update("suggestions", v)} placeholder="مثال: زيادة عدد الريلز الأسبوعية إلى 4" />
        </div>

        <label style={{ ...labelStyle, marginTop: 4 }}>حالة العرض</label>
        <select style={fieldStyle} value={form.status} onChange={(e) => update("status", e.target.value)}>
          <option value={ANALYTICS_STATUS.PUBLISHED}>👁️ منشور (ظاهر للعميل)</option>
          <option value={ANALYTICS_STATUS.DRAFT}>📝 مسودة (مخفي عن العميل)</option>
        </select>

        {error && <p style={{ color: "#ff8080", fontSize: 12, marginTop: 4, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ التقرير"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = "1" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="number" step={step} style={fieldStyle} value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// المكوّن الرئيسي
// ----------------------------------------------------------------------------
export default function AnalyticsManager() {
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
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

  async function loadSnapshots(clientId) {
    setLoadingSnapshots(true);
    try {
      const data = await fetchClientAnalyticsForAdmin(clientId);
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    } finally {
      setLoadingSnapshots(false);
    }
  }

  function selectClient(client) {
    setSelectedClient(client);
    loadSnapshots(client.user_id);
  }

  async function handleDelete(snap) {
    if (!window.confirm(`تأكيد حذف تقرير "${snap.period_label}"؟`)) return;
    await deleteAnalyticsSnapshot(snap.id);
    setSnapshots((list) => list.filter((s) => s.id !== snap.id));
    flash("🗑️ تم الحذف");
  }

  async function handleToggleStatus(snap) {
    const next = snap.status === ANALYTICS_STATUS.PUBLISHED ? ANALYTICS_STATUS.DRAFT : ANALYTICS_STATUS.PUBLISHED;
    const updated = await setAnalyticsStatus(snap.id, next);
    setSnapshots((list) => list.map((s) => (s.id === snap.id ? updated : s)));
  }

  return (
    <div dir="rtl">
      <p style={{ color: "#888", fontSize: 12.5, marginBottom: 16 }}>
        اختار عميل من القائمة، بعدين ضيف/عدّل تقرير التحليلات الشهري بتاعه. التقارير "منشورة" فقط تظهر في لوحة العميل.
      </p>

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

        {/* عمود التقارير */}
        <div style={{ gridColumn: "span 2 / span 2" }}>
          {!selectedClient ? (
            <div style={{ textAlign: "center", padding: "40px 16px", border: "1px dashed rgba(201,150,58,0.3)", borderRadius: 14, color: "#888", fontSize: 13 }}>
              اختار عميل من القائمة الجانبية عشان تشوف/تضيف تقارير التحليلات بتاعته.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  📈 تحليلات: {selectedClient.full_name || selectedClient.business_name || "عميل"}
                </h3>
                <button
                  onClick={() => setEditing({})}
                  style={{ padding: "9px 16px", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: "pointer" }}
                >
                  ➕ تقرير جديد
                </button>
              </div>

              {loadingSnapshots ? (
                <p style={{ color: "#888" }}>جاري التحميل...</p>
              ) : snapshots.length === 0 ? (
                <p style={{ color: "#888" }}>لا توجد تقارير لهذا العميل بعد.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
                        borderRadius: 14, padding: 16, opacity: snap.status === ANALYTICS_STATUS.DRAFT ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <h4 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{snap.period_label}</h4>
                          <p style={{ color: "#888", fontSize: 11, marginTop: 3 }}>
                            {snap.status === ANALYTICS_STATUS.DRAFT ? "📝 مسودة" : "👁️ منشور"}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          <MiniStat label="الوصول" value={snap.reach} />
                          <MiniStat label="التفاعل" value={`${snap.engagement_rate}%`} />
                          <MiniStat label="المتابعين" value={snap.followers_count} />
                          <MiniStat label="الزيارات" value={snap.profile_visits} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                        <ActionBtn onClick={() => setEditing(snap)}>✏️ تعديل</ActionBtn>
                        <ActionBtn onClick={() => handleToggleStatus(snap)}>
                          {snap.status === ANALYTICS_STATUS.DRAFT ? "👁️ نشر للعميل" : "📝 تحويل لمسودة"}
                        </ActionBtn>
                        <ActionBtn danger onClick={() => handleDelete(snap)}>🗑️ حذف</ActionBtn>
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
        <AnalyticsFormModal
          clientId={selectedClient.user_id}
          item={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadSnapshots(selectedClient.user_id); }}
          flash={flash}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: GOLD3, fontWeight: 800, fontSize: 13 }}>{typeof value === "number" ? value.toLocaleString("en-US") : value}</div>
      <div style={{ color: "#777", fontSize: 10 }}>{label}</div>
    </div>
  );
}
