// src/components/SubscriptionsManager.jsx
//
// تبويب "الاشتراكات" في لوحة السوبر أدمن — إدارة طلبات اشتراك العملاء
// (Pending → Active بعد الموافقة، أو Cancelled) + إدارة أكواد الخصم (تفعيل/تعطيل).

import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchAllSubscriptionsForAdmin,
  activateSubscription,
  setSubscriptionStatus,
  deleteSubscription,
  expireOverdueSubscriptions,
  fetchCouponsForAdmin,
  createCoupon,
  updateCoupon,
  toggleCouponActive,
  deleteCoupon,
} from "../services/subscriptionAdminService";
import { subscriptionStatusLabel } from "../services/subscriptionService";

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

const STATUS_TABS = [
  { id: "all", label: "الكل" },
  { id: "pending", label: "قيد المراجعة" },
  { id: "active", label: "نشط" },
  { id: "expired", label: "منتهي" },
  { id: "cancelled", label: "ملغي" },
];

const STATUS_DOT = { pending: "#facc15", active: "#4ade80", expired: "#9ca3af", cancelled: "#f87171" };

function ActionBtn({ children, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${danger ? "rgba(255,80,80,0.35)" : "rgba(201,150,58,0.3)"}`,
        background: "none", color: danger ? "#ff8080" : "#ddd", opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// مودال تفعيل الاشتراك — تحديد مدة الباقة بالأيام
// ============================================================================
function ActivateModal({ sub, onClose, onDone }) {
  const [durationDays, setDurationDays] = useState(30);
  const [saving, setSaving] = useState(false);

  async function handleActivate() {
    setSaving(true);
    try {
      const updated = await activateSubscription(sub.id, { durationDays: Number(durationDays) });
      onDone(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 380, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 6 }}>✅ تفعيل الاشتراك</h3>
        <p style={{ color: "#888", fontSize: 12.5, marginBottom: 16 }}>باقة «{sub.package_name}» — {sub.business_name}</p>
        <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>مدة الاشتراك (بالأيام)</label>
        <input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} style={{ ...fieldStyle, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>إلغاء</button>
          <button
            onClick={handleActivate}
            disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "جاري التفعيل..." : "تفعيل"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// جدول الاشتراكات
// ============================================================================
function SubscriptionsTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [activating, setActivating] = useState(null);
  const [flash, setFlash] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllSubscriptionsForAdmin({ status: statusFilter });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  function notify(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  }

  async function handleCancel(sub) {
    if (!window.confirm("تأكيد إلغاء طلب الاشتراك ده؟")) return;
    const updated = await setSubscriptionStatus(sub.id, "cancelled");
    setItems((list) => list.map((s) => (s.id === updated.id ? updated : s)));
    notify("🚫 تم الإلغاء");
  }

  async function handleDelete(sub) {
    if (!window.confirm("تأكيد حذف طلب الاشتراك نهائيًا؟")) return;
    await deleteSubscription(sub.id);
    setItems((list) => list.filter((s) => s.id !== sub.id));
    notify("🗑️ تم الحذف");
  }

  async function handleExpireOverdue() {
    const count = await expireOverdueSubscriptions();
    notify(count > 0 ? `⏳ تم تحديث ${count} اشتراك إلى "منتهي"` : "لا يوجد اشتراكات محتاجة تحديث");
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            style={{
              padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${statusFilter === t.id ? GOLD : "rgba(255,255,255,0.1)"}`,
              background: statusFilter === t.id ? "rgba(201,150,58,0.12)" : "none",
              color: statusFilter === t.id ? GOLD3 : "#aaa",
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={handleExpireOverdue}
          style={{ marginRight: "auto", padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa" }}
        >
          ⏳ تحديث الاشتراكات المنتهية
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد طلبات في هذه الحالة.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((sub) => (
            <div key={sub.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6, gap: 8 }}>
                <h4 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>📦 {sub.package_name || "—"}</h4>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#aaa" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[sub.status] }} />
                  {subscriptionStatusLabel(sub.status)}
                </span>
              </div>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                👤 {sub.clients?.full_name || "—"} {sub.clients?.phone ? `· ${sub.clients.phone}` : ""}
              </p>
              {sub.business_name && <p style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>🏢 {sub.business_name}</p>}
              {sub.is_renewal && <p style={{ color: GOLD2, fontSize: 11, marginBottom: 4 }}>🔄 طلب تجديد</p>}
              {sub.coupon_code && (
                <p style={{ color: "#4ade80", fontSize: 11.5, marginBottom: 4 }}>
                  🏷️ كوبون: {sub.coupon_code} (خصم {Number(sub.discount_amount || 0).toLocaleString()} ج.م)
                </p>
              )}
              <p style={{ color: GOLD3, fontWeight: 800, fontSize: 15, margin: "8px 0" }}>
                {Number(sub.final_price || 0).toLocaleString()} ج.م
              </p>
              {sub.status === "active" && (
                <p style={{ color: "#888", fontSize: 11.5, marginBottom: 8 }}>
                  من {sub.start_date || "—"} إلى {sub.end_date || "—"}
                </p>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sub.status === "pending" && (
                  <ActionBtn onClick={() => setActivating(sub)}>✅ تفعيل</ActionBtn>
                )}
                {(sub.status === "pending" || sub.status === "active") && (
                  <ActionBtn onClick={() => handleCancel(sub)} danger>🚫 إلغاء</ActionBtn>
                )}
                <ActionBtn onClick={() => handleDelete(sub)} danger>🗑️ حذف</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {activating && (
        <ActivateModal
          sub={activating}
          onClose={() => setActivating(null)}
          onDone={(updated) => {
            setItems((list) => list.map((s) => (s.id === updated.id ? updated : s)));
            setActivating(null);
            notify("✅ تم تفعيل الاشتراك");
          }}
        />
      )}

      {flash && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 12, background: GOLD, color: "#000", fontWeight: 800, fontSize: 13, zIndex: 300 }}>
          {flash}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// إدارة أكواد الخصم
// ============================================================================
const emptyCouponForm = { code: "", discountType: "percent", discountValue: 10, maxUses: "", expiresAt: "" };

function CouponsPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyCouponForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCouponsForAdmin();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      maxUses: c.max_uses ?? "",
      expiresAt: c.expires_at ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyCouponForm);
    setError("");
  }

  async function handleSave() {
    if (!form.code.trim()) {
      setError("لازم تكتب كود الخصم.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await updateCoupon(editingId, form);
        setItems((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCoupon(form);
        setItems((list) => [created, ...list]);
      }
      resetForm();
    } catch (e) {
      setError(e.message?.includes("duplicate") ? "الكود ده مستخدم بالفعل." : "حصل خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c) {
    const updated = await toggleCouponActive(c.id, !c.is_active);
    setItems((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDelete(c) {
    if (!window.confirm(`تأكيد حذف كود الخصم "${c.code}"؟`)) return;
    await deleteCoupon(c.id);
    setItems((list) => list.filter((x) => x.id !== c.id));
  }

  return (
    <div>
      <div style={{ borderRadius: 14, border: "1px solid rgba(201,150,58,0.2)", background: "rgba(255,255,255,0.02)", padding: 18, marginBottom: 20 }}>
        <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
          {editingId ? "✏️ تعديل كود خصم" : "➕ إضافة كود خصم جديد"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
          <input placeholder="الكود (مثال: WELCOME10)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} style={fieldStyle} />
          <select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))} style={fieldStyle}>
            <option value="percent">نسبة %</option>
            <option value="fixed">مبلغ ثابت (ج.م)</option>
          </select>
          <input type="number" placeholder="قيمة الخصم" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} style={fieldStyle} />
          <input type="number" placeholder="حد الاستخدام (اختياري)" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} style={fieldStyle} />
          <input type="date" placeholder="تاريخ الانتهاء (اختياري)" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} style={fieldStyle} />
        </div>
        {error && <p style={{ color: "#ff8080", fontSize: 12, marginTop: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة الكود"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
              إلغاء
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>لا توجد أكواد خصم حتى الآن.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,150,58,0.25)" }}>
                {["الكود", "النوع", "القيمة", "مرات الاستخدام", "الحالة", ""].map((h) => (
                  <th key={h} style={{ textAlign: "right", padding: "10px 8px", color: "#888", fontSize: 11.5, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 800, fontSize: 13 }}>{c.code}</td>
                  <td style={{ padding: "10px 8px", color: "#ccc", fontSize: 12.5 }}>{c.discount_type === "percent" ? "نسبة %" : "مبلغ ثابت"}</td>
                  <td style={{ padding: "10px 8px", color: GOLD2, fontSize: 12.5, fontWeight: 700 }}>
                    {c.discount_value}{c.discount_type === "percent" ? "%" : " ج.م"}
                  </td>
                  <td style={{ padding: "10px 8px", color: "#ccc", fontSize: 12.5 }}>
                    {c.used_count} {c.max_uses ? `/ ${c.max_uses}` : ""}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <button
                      onClick={() => handleToggle(c)}
                      style={{
                        padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, cursor: "pointer", border: "none",
                        color: c.is_active ? "#4ade80" : "#f87171",
                        background: c.is_active ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                      }}
                    >
                      {c.is_active ? "🟢 مفعّل" : "⚪ معطّل"}
                    </button>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionBtn onClick={() => startEdit(c)}>✏️</ActionBtn>
                      <ActionBtn onClick={() => handleDelete(c)} danger>🗑️</ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// المكوّن الرئيسي
// ============================================================================
export default function SubscriptionsManager() {
  const [subTab, setSubTab] = useState("subscriptions");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setSubTab("subscriptions")}
          style={{
            padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800,
            border: `1px solid ${subTab === "subscriptions" ? GOLD : "rgba(255,255,255,0.1)"}`,
            background: subTab === "subscriptions" ? "rgba(201,150,58,0.12)" : "none",
            color: subTab === "subscriptions" ? GOLD3 : "#aaa",
          }}
        >
          📦 طلبات الاشتراك
        </button>
        <button
          onClick={() => setSubTab("coupons")}
          style={{
            padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800,
            border: `1px solid ${subTab === "coupons" ? GOLD : "rgba(255,255,255,0.1)"}`,
            background: subTab === "coupons" ? "rgba(201,150,58,0.12)" : "none",
            color: subTab === "coupons" ? GOLD3 : "#aaa",
          }}
        >
          🏷️ أكواد الخصم
        </button>
      </div>

      {subTab === "subscriptions" ? <SubscriptionsTable /> : <CouponsPanel />}
    </div>
  );
}
