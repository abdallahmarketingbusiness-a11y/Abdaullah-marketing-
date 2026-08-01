// src/components/ClientDashboard.jsx
//
// لوحة تحكم العميل — صفحة مستقلة كاملة، بنفس الهوية البصرية للموقع (ذهبي/أسود، خط Cairo).
//
// == إزاي تضيف ميزة/تبويب جديد لاحقًا (مهم) ==
// 1) عرّف مكوّن التبويب الجديد في آخر الملف (بنفس نمط Overview/Profile/Projects...).
// 2) ضيفه لمصفوفة SECTIONS تحت وحدد: id (فريد), label (اسم يظهر بالقائمة), icon (إيموجي أو حرف),
//    و render (function ترجّع الـ JSX بتاعت التبويب، وبتستقبل props { profile, refreshProfile, notify }).
// 3) خلاص، هيظهر تلقائيًا في القائمة الجانبية وفي شريط الموبايل من غير أي تعديل تاني.
//
// أي بيانات حقيقية جديدة (مشاريع، فواتير، طلبات..) المفروض تتضاف كـ service جديد في src/services
// وتتنادى من جوه render() بتاع التبويب المناسب، بنفس أسلوب باقي المشروع.

import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, BG, FONT } from "../config/theme";
import {
  getClientProfile,
  getCurrentClientSession,
  updateClientProfile,
  requestPasswordReset,
} from "../services/clientAuthService";
import Toast from "./Toast";

// ============================================================================
// إعدادات عامة
// ============================================================================
const WHATSAPP_NUMBER = "201069032563";

function goTo(hash) {
  window.location.hash = hash;
}

function getInitials(name) {
  const clean = (name || "").trim();
  if (!clean) return "؟";
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts.length > 1 ? parts[1]?.[0] || "" : "";
  return (first + second) || clean[0];
}

// ============================================================================
// المكوّن الرئيسي
// ============================================================================
export default function ClientDashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState(null);

  function notify(type, text) {
    setToast({ type, text });
  }

  async function loadProfile() {
    setLoading(true);
    const [p, session] = await Promise.all([getClientProfile(), getCurrentClientSession()]);
    setProfile(p);
    setEmail(session?.user?.email || "");
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const displayName = profile?.full_name?.trim() || "عميل عزيز";

  const activeMeta = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0],
    [activeSection]
  );

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", padding: "110px 16px 60px", fontFamily: FONT }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ==================== Header ==================== */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between"
          style={{ gap: 16, marginBottom: 26 }}
        >
          <div className="flex items-center" style={{ gap: 14 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: `linear-gradient(135deg,${GOLD},${GOLD3})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 20, color: "#000",
                boxShadow: "0 8px 24px rgba(201,150,58,0.25)",
              }}
            >
              {getInitials(profile?.full_name)}
            </div>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 900, color: "#fff", margin: 0 }}>
                {loading ? "جاري التحميل..." : `أهلاً، ${displayName}`}
              </h1>
              <p style={{ color: "#888", fontSize: 12.5, margin: "4px 0 0" }}>
                {profile?.business_name ? profile.business_name : "لوحة تحكم العميل"}
              </p>
            </div>
          </div>

          {/* زرار قائمة الموبايل */}
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden"
            style={{
              alignSelf: "flex-start",
              padding: "9px 14px", borderRadius: 12,
              border: "1px solid rgba(201,150,58,0.35)",
              background: "rgba(255,255,255,0.03)", color: GOLD2,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            {mobileNavOpen ? "إغلاق القائمة ✕" : "أقسام اللوحة ☰"}
          </button>
        </div>

        {/* ==================== Body: Sidebar + Content ==================== */}
        <div className="flex flex-col lg:flex-row-reverse" style={{ gap: 22, alignItems: "flex-start" }}>
          {/* ---------- Sidebar (Desktop) / Dropdown (Mobile) ---------- */}
          <aside
            className={mobileNavOpen ? "block" : "hidden lg:block"}
            style={{
              width: "100%",
              flexShrink: 0,
              background: "linear-gradient(160deg,#120c02,#080602)",
              border: "1px solid rgba(201,150,58,0.25)",
              borderRadius: 18,
              padding: 12,
            }}
          >
            <nav className="grid grid-cols-2 lg:grid-cols-1" style={{ gap: 6 }}>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    setMobileNavOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", textAlign: "right",
                    padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
                    fontFamily: FONT, fontWeight: 700, fontSize: 13.5,
                    background: activeSection === s.id ? `linear-gradient(135deg,${GOLD},${GOLD2})` : "transparent",
                    color: activeSection === s.id ? "#000" : "#ccc",
                    transition: "background .15s ease",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>

            <div style={{ height: 1, background: "rgba(201,150,58,0.2)", margin: "12px 4px" }} />

            <button
              onClick={onLogout}
              style={{
                display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                width: "100%", padding: "11px 14px", borderRadius: 12,
                border: "1px solid rgba(255,90,90,0.35)", cursor: "pointer",
                fontFamily: FONT, fontWeight: 700, fontSize: 13.5,
                background: "transparent", color: "#ff8f8f",
              }}
            >
              🚪 تسجيل الخروج
            </button>
          </aside>

          {/* ---------- Content ---------- */}
          <main style={{ flex: 1, width: "100%", minWidth: 0 }}>
            <div
              style={{
                background: "linear-gradient(160deg,#120c02,#080602)",
                border: "1px solid rgba(201,150,58,0.25)",
                borderRadius: 18,
                padding: "24px 20px",
                minHeight: 340,
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: GOLD3, margin: 0 }}>
                  {activeMeta.icon} {activeMeta.label}
                </h2>
                {activeMeta.subtitle && (
                  <p style={{ color: "#888", fontSize: 12.5, margin: "6px 0 0" }}>{activeMeta.subtitle}</p>
                )}
              </div>

              {loading ? (
                <p style={{ color: "#888", fontSize: 13 }}>جاري تحميل بياناتك...</p>
              ) : (
                activeMeta.render({ profile, email, refreshProfile: loadProfile, notify })
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// تبويب: نظرة عامة
// ============================================================================
function OverviewSection({ profile, email }) {
  const cards = [
    { label: "الاسم الكامل", value: profile?.full_name || "—", icon: "👤" },
    { label: "النشاط التجاري", value: profile?.business_name || "—", icon: "🏢" },
    { label: "البريد الإلكتروني", value: email || "—", icon: "✉️" },
    { label: "رقم الهاتف", value: profile?.phone || "—", icon: "📱" },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12, marginBottom: 22 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              border: "1px solid rgba(201,150,58,0.2)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 14, padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
              {c.icon} {c.label}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", wordBreak: "break-word" }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>روابط سريعة</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
        <QuickLink icon="📦" label="تصفح الباقات" onClick={() => goTo("gallery")} />
        <QuickLink icon="🖼️" label="معرض الأعمال" onClick={() => goTo("portfolio-gallery")} />
        <QuickLink icon="💬" label="تواصل معنا" onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")} />
      </div>
    </div>
  );
}

function QuickLink({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        border: "1px solid rgba(201,150,58,0.3)", borderRadius: 12,
        background: "rgba(255,255,255,0.02)", color: "#eee",
        padding: "12px 14px", cursor: "pointer", fontFamily: FONT,
        fontWeight: 700, fontSize: 13, textAlign: "right", width: "100%",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// تبويب: الملف الشخصي (قابل للتعديل)
// ============================================================================
function ProfileSection({ profile, email, refreshProfile, notify }) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [businessName, setBusinessName] = useState(profile?.business_name || "");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setBusinessName(profile?.business_name || "");
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      notify("error", "من فضلك اكتب اسم صحيح.");
      return;
    }
    setSaving(true);
    try {
      await updateClientProfile({ fullName: fullName.trim(), phone: phone.trim(), businessName: businessName.trim() });
      await refreshProfile();
      notify("success", "تم حفظ بياناتك بنجاح ✅");
    } catch (err) {
      notify("error", "حصل خطأ أثناء الحفظ، حاول تاني.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) return;
    setSendingReset(true);
    try {
      await requestPasswordReset(email);
      notify("success", "بعتنالك رابط تغيير كلمة المرور على إيميلك.");
    } catch (err) {
      notify("error", "تعذّر إرسال رابط تغيير كلمة المرور.");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
        <Field label="الاسم الكامل">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input value={email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
        </Field>
        <Field label="رقم الهاتف">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="01xxxxxxxxx" />
        </Field>
        <Field label="اسم النشاط التجاري">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div className="flex flex-col sm:flex-row" style={{ gap: 10, marginTop: 20 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 26px", borderRadius: 12, border: "none",
            fontWeight: 800, fontSize: 13.5, cursor: saving ? "not-allowed" : "pointer",
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`, color: "#000",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
        </button>
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={sendingReset}
          style={{
            padding: "12px 26px", borderRadius: 12,
            border: "1px solid rgba(201,150,58,0.4)", background: "transparent",
            fontWeight: 700, fontSize: 13.5, cursor: sendingReset ? "not-allowed" : "pointer", color: GOLD,
          }}
        >
          {sendingReset ? "جاري الإرسال..." : "🔑 تغيير كلمة المرور"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12.5, color: "#aaa", marginBottom: 6, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid rgba(201,150,58,0.3)", background: "rgba(255,255,255,0.03)",
  color: "#fff", fontSize: 13.5, fontFamily: FONT, outline: "none", boxSizing: "border-box",
};

// ============================================================================
// تبويب: مشاريعي (Placeholder — جاهز لإضافة بيانات حقيقية لاحقًا)
// ============================================================================
function ProjectsSection() {
  return (
    <ComingSoon
      icon="📁"
      title="مشاريعك هتظهر هنا قريبًا"
      text="هنعرض هنا حالة كل مشروع بتطلبه (تحت التنفيذ / تسليم / مراجعة) أول ما يتم ربط اللوحة بنظام إدارة الطلبات."
    />
  );
}

// ============================================================================
// تبويب: باقاتي (Placeholder + رابط لمعرض الباقات)
// ============================================================================
function PackagesSection() {
  return (
    <div>
      <ComingSoon
        icon="📦"
        title="سجل طلباتك من الباقات قريبًا"
        text="لسه بنجهّز ربط حسابك بالباقات اللي بتطلبها عشان تقدر تتابع حالتها من هنا مباشرة."
      />
      <div style={{ marginTop: 16 }}>
        <QuickLink icon="🛍️" label="تصفح الباقات المتاحة الآن" onClick={() => goTo("gallery")} />
      </div>
    </div>
  );
}

// ============================================================================
// تبويب: الدعم والتواصل
// ============================================================================
function SupportSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
      <ContactCard
        icon="💬"
        title="واتساب"
        text="أسرع طريقة للرد على استفساراتك"
        actionLabel="تواصل الآن"
        onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")}
      />
      <ContactCard
        icon="🖼️"
        title="معرض الأعمال"
        text="شوف أحدث الأعمال اللي اتنفذت"
        actionLabel="فتح المعرض"
        onClick={() => goTo("portfolio-gallery")}
      />
    </div>
  );
}

function ContactCard({ icon, title, text, actionLabel, onClick }) {
  return (
    <div
      style={{
        border: "1px solid rgba(201,150,58,0.25)", borderRadius: 14,
        background: "rgba(255,255,255,0.02)", padding: 18,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div style={{ color: "#888", fontSize: 12.5, marginBottom: 14 }}>{text}</div>
      <button
        onClick={onClick}
        style={{
          padding: "9px 18px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg,${GOLD},${GOLD2})`, color: "#000",
          fontWeight: 800, fontSize: 12.5, cursor: "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ============================================================================
// عنصر مشترك: حالة "قريبًا"
// ============================================================================
function ComingSoon({ icon, title, text }) {
  return (
    <div
      style={{
        textAlign: "center", padding: "34px 16px",
        border: "1px dashed rgba(201,150,58,0.3)", borderRadius: 14,
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14.5, marginBottom: 6 }}>{title}</div>
      <p style={{ color: "#888", fontSize: 12.5, maxWidth: 420, margin: "0 auto" }}>{text}</p>
    </div>
  );
}

// ============================================================================
// سجل الأقسام — أضف هنا أي تبويب جديد
// ============================================================================
const SECTIONS = [
  { id: "overview", label: "نظرة عامة", icon: "📊", subtitle: "ملخص سريع لحسابك وأهم الروابط", render: OverviewSection },
  { id: "profile", label: "الملف الشخصي", icon: "👤", subtitle: "عدّل بياناتك الشخصية وكلمة المرور", render: ProfileSection },
  { id: "projects", label: "مشاريعي", icon: "📁", subtitle: "متابعة حالة مشاريعك مع الفريق", render: ProjectsSection },
  { id: "packages", label: "باقاتي", icon: "📦", subtitle: "الباقات اللي طلبتها وحالتها", render: PackagesSection },
  { id: "support", label: "الدعم والتواصل", icon: "💬", subtitle: "تواصل معنا في أي وقت", render: SupportSection },
];
