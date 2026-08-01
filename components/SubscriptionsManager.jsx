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
  createManualSubscription,
  fetchCouponsForAdmin,
  createCoupon,
  updateCoupon,
  toggleCouponActive,
  deleteCoupon,
} from "../services/subscriptionAdminService";
import { subscriptionStatusLabel } from "../services/subscriptionService";
import { fetchAllClientsForAdmin } from "../services/clientAuthService";
import { fetchAllPackagesForAdmin } from "../services/packagesService";

// نفس أسعار باقات "اختار الباقة اللي تناسبك" في الصفحة الرئيسية (app/page.jsx
// → PricingSection) — لو الأسعار اتغيّرت هناك لازم تتحدّث هنا كمان.
const READY_TIERS = [
  { tier: "الأساسية", price: 1800 },
  { tier: "المتقدمة", price: 2800 },
  { tier: "الاحترافية", price: 4500 },
  { tier: "الشاملة", price: 6500 },
];

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
// مودال "إضافة اشتراك يدوي" — الأدمن يربط عميل بباقة مباشرة من غير ما يعدي
// العميل بخطوات الاشتراك من الموقع. مصدر الباقة: إما باقة جاهزة (بالاسم
// والسعر الثابت)، أو باقة مخصصة محفوظة فعلاً في كتالوج الباقات (packages) —
// نفس بيانات "تخصيص الباقة" اللي العميل أو الأدمن عملها من الموقع.
// ============================================================================
function AssignSubscriptionModal({ onClose, onDone }) {
  const [step, setStep] = useState(1); // 1: اختيار عميل, 2: بيانات الاشتراك

  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [client, setClient] = useState(null);

  const [source, setSource] = useState("ready"); // "ready" | "custom"
  const [readyTier, setReadyTier] = useState(READY_TIERS[0].tier);

  const [customSearch, setCustomSearch] = useState("");
  const [customPackages, setCustomPackages] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customPkg, setCustomPkg] = useState(null);

  const [businessName, setBusinessName] = useState("");
  const [finalPrice, setFinalPrice] = useState(READY_TIERS[0].price);
  const [status, setStatus] = useState("active");
  const [durationDays, setDurationDays] = useState(30);
  const [adminNote, setAdminNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (source !== "custom") return;
    setLoadingCustom(true);
    fetchAllPackagesForAdmin()
      .then(setCustomPackages)
      .catch(() => setCustomPackages([]))
      .finally(() => setLoadingCustom(false));
  }, [source]);

  function pickClient(c) {
    setClient(c);
    setBusinessName(c.business_name || "");
    setStep(2);
  }

  function pickReadyTier(tier) {
    const t = READY_TIERS.find((x) => x.tier === tier);
    setReadyTier(tier);
    setFinalPrice(t?.price || 0);
  }

  function pickCustomPkg(p) {
    setCustomPkg(p);
    setFinalPrice(Number(p.final_price || 0));
    if (p.business_name) setBusinessName(p.business_name);
  }

  const visibleCustomPackages = customSearch.trim()
    ? customPackages.filter((p) =>
        `${p.package_name} ${p.business_name}`.toLowerCase().includes(customSearch.trim().toLowerCase())
      )
    : customPackages;

  async function handleSave() {
    setError("");
    const packageName = source === "ready" ? `باقة ${readyTier}` : customPkg?.package_name;
    if (source === "custom" && !customPkg) {
      setError("اختار باقة مخصصة محفوظة الأول.");
      return;
    }
    setSaving(true);
    try {
      const created = await createManualSubscription({
        clientId: client.user_id,
        packageId: source === "custom" ? customPkg.id : null,
        packageName,
        businessName,
        basePrice: finalPrice,
        finalPrice,
        status,
        durationDays: Number(durationDays) || 30,
        adminNote,
      });
      onDone(created);
    } catch (e) {
      setError(e.message || "حصل خطأ أثناء إضافة الاشتراك.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div dir="rtl" style={{ width: "100%", maxWidth: 560, background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 18, padding: 24, marginTop: 30, marginBottom: 30 }}>
        <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, marginBottom: 6, fontSize: 18 }}>➕ إضافة اشتراك يدوي</h3>
        <p style={{ color: "#888", fontSize: 12.5, marginBottom: 18 }}>
          {step === 1 ? "اختار العميل الأول" : `العميل: ${client?.full_name || client?.business_name || "—"}`}
        </p>

        {step === 1 ? (
          <>
            <input
              placeholder="🔍 بحث بالاسم أو النشاط أو الهاتف..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              style={{ ...fieldStyle, marginBottom: 12 }}
            />
            {loadingClients ? (
              <p style={{ color: "#888", fontSize: 12.5 }}>جاري التحميل...</p>
            ) : clients.length === 0 ? (
              <p style={{ color: "#888", fontSize: 12.5 }}>لا يوجد عملاء مطابقين.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                {clients.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => pickClient(c)}
                    style={{
                      textAlign: "right", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{c.full_name || "بدون اسم"}</div>
                    <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{c.business_name || "—"} {c.phone ? `· ${c.phone}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>
                إلغاء
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", marginBottom: 14, padding: 0 }}
            >
              → تغيير العميل
            </button>

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 8, fontWeight: 700 }}>مصدر الباقة</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setSource("ready")}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: `1px solid ${source === "ready" ? GOLD : "rgba(255,255,255,0.1)"}`,
                  background: source === "ready" ? "rgba(201,150,58,0.12)" : "none",
                  color: source === "ready" ? GOLD3 : "#aaa",
                }}
              >
                📦 باقة جاهزة
              </button>
              <button
                type="button"
                onClick={() => setSource("custom")}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  border: `1px solid ${source === "custom" ? GOLD : "rgba(255,255,255,0.1)"}`,
                  background: source === "custom" ? "rgba(201,150,58,0.12)" : "none",
                  color: source === "custom" ? GOLD3 : "#aaa",
                }}
              >
                🎨 باقة مخصصة محفوظة
              </button>
            </div>

            {source === "ready" ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>اختار الباقة</label>
                <select value={readyTier} onChange={(e) => pickReadyTier(e.target.value)} style={fieldStyle}>
                  {READY_TIERS.map((t) => (
                    <option key={t.tier} value={t.tier}>باقة {t.tier} — {t.price.toLocaleString()} ج.م</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <input
                  placeholder="🔍 بحث باسم الباقة أو النشاط..."
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  style={{ ...fieldStyle, marginBottom: 8 }}
                />
                {loadingCustom ? (
                  <p style={{ color: "#888", fontSize: 12.5 }}>جاري التحميل...</p>
                ) : visibleCustomPackages.length === 0 ? (
                  <p style={{ color: "#888", fontSize: 12.5 }}>لا توجد باقات مخصصة مطابقة.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {visibleCustomPackages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickCustomPkg(p)}
                        style={{
                          textAlign: "right", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${customPkg?.id === p.id ? GOLD : "rgba(255,255,255,0.08)"}`,
                          background: customPkg?.id === p.id ? "rgba(201,150,58,0.1)" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>📦 {p.package_name}</div>
                        <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                          {p.business_name || "—"} · {Number(p.final_price || 0).toLocaleString()} ج.م
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>اسم النشاط</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{ ...fieldStyle, marginBottom: 12 }} />

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>السعر النهائي (ج.م)</label>
            <input type="number" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} style={{ ...fieldStyle, marginBottom: 12 }} />

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>الحالة</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...fieldStyle, marginBottom: 12 }}>
              <option value="active">نشط (يتفعّل فورًا)</option>
              <option value="pending">قيد المراجعة</option>
            </select>

            {status === "active" && (
              <>
                <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>مدة الاشتراك (بالأيام)</label>
                <input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} style={{ ...fieldStyle, marginBottom: 12 }} />
              </>
            )}

            <label style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>ملاحظة الأدمن (اختياري)</label>
            <textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} style={{ ...fieldStyle, resize: "vertical", marginBottom: 6 }} />

            {error && <p style={{ color: "#ff8080", fontSize: 12, marginTop: 8 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #333", background: "none", color: "#aaa", cursor: "pointer" }}>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD},${GOLD2})`, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "جاري الحفظ..." : "إضافة الاشتراك"}
              </button>
            </div>
          </>
        )}
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
  const [assigning, setAssigning] = useState(false);
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
          onClick={() => setAssigning(true)}
          style={{ marginRight: "auto", padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 800, border: `1px solid ${GOLD}`, background: "rgba(201,150,58,0.12)", color: GOLD3 }}
        >
          ➕ إضافة اشتراك يدوي
        </button>
        <button
          onClick={handleExpireOverdue}
          style={{ padding: "7px 14px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#aaa" }}
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

      {assigning && (
        <AssignSubscriptionModal
          onClose={() => setAssigning(false)}
          onDone={(created) => {
            setAssigning(false);
            notify("✅ تم إضافة الاشتراك للعميل");
            if (statusFilter === "all" || statusFilter === created.status) {
              setItems((list) => [created, ...list]);
            } else {
              setStatusFilter(created.status);
            }
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
