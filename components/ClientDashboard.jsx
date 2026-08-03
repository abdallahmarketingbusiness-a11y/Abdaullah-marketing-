// src/components/ClientDashboard.jsx
//
// لوحة تحكم العميل الاحترافية — صفحة مستقلة كاملة، بنفس الهوية البصرية للموقع (ذهبي/أسود، خط Cairo).
//
// == إزاي تضيف قسم جديد لاحقًا (مهم) ==
// 1) لو القسم محتاج بيانات، ضيف دالة جديدة في src/services/clientPortalService.js (نفس نمط الدوال الموجودة).
// 2) عرّف مكوّن القسم هنا (نفس نمط HomeSection / AnalyticsSection ...).
// 3) ضيفه لمصفوفة SECTIONS آخر الملف: id فريد، label، icon، render.
// خلاص، هيظهر تلقائيًا في القائمة الجانبية وشريط الموبايل من غير أي تعديل تاني.
//
// كل الأقسام (الرئيسية/التحليلات/الأداء/الحملات/التقارير/الملفات/السكربتات/
// الملاحظات/الفواتير/الإشعارات) بتعرض بيانات حقيقية من Supabase. الأدمن بيضيفها
// من لوحة السوبر أدمن → تبويب "بيانات لوحة العميل" (وتبويب "تحليلات العملاء"
// للتحليلات تحديدًا). التفاصيل في src/services/clientPortalService.js
// و sql/migration_client_portal.sql.

import { useEffect, useMemo, useState } from "react";
import { GOLD, GOLD2, GOLD3, BG, FONT } from "../config/theme";
import {
  getClientProfile,
  getCurrentClientSession,
  updateClientProfile,
  requestPasswordReset,
} from "../services/clientAuthService";
import {
  getHomeSummary,
  getAnalytics,
  getPerformance,
  getCampaigns,
  getReports,
  getFiles,
  getScripts,
  getNotes,
  getInvoices,
  downloadClientFile,
} from "../services/clientPortalService";
import { NOTIF_ICONS } from "../lib/notificationIcons";
import Toast from "./Toast";
import FilePreviewModal from "./FilePreviewModal";
import { AnalyticsTrendChart, PostsCompareList, InsightList } from "./AnalyticsCharts";
import { fetchMySubscriptions, requestRenewal } from "../services/subscriptionService";

// ============================================================================
// إعدادات وعناصر عامة
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

const STATUS_COLORS = {
  "نشط": "#4ade80", "نشطة": "#4ade80",
  "متوقفة مؤقتًا": "#facc15", "مسودة": "#facc15", "مستحقة": "#facc15", "قيد المراجعة": "#facc15",
  "منتهية": "#9ca3af", "مدفوعة": "#4ade80", "معتمد": "#4ade80",
  "منتهي": "#9ca3af", "ملغي": "#f87171",
};

function Badge({ text }) {
  const color = STATUS_COLORS[text] || GOLD2;
  return (
    <span
      style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 999,
        fontSize: 11, fontWeight: 800, color,
        background: `${color}22`, border: `1px solid ${color}55`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        border: "1px solid rgba(201,150,58,0.2)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 14, padding: "16px 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLoading() {
  return <p style={{ color: "#888", fontSize: 13 }}>جاري تحميل البيانات...</p>;
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        textAlign: "center", padding: "26px 16px",
        border: "1px dashed rgba(201,150,58,0.3)", borderRadius: 14,
        background: "rgba(255,255,255,0.015)", color: "#888", fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function ProgressBar({ value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${GOLD},${GOLD2})` }} />
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
// المكوّن الرئيسي
// ============================================================================
export default function ClientDashboard({ onLogout, notifications, onNotificationClick, onMarkAllRead }) {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
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
  const unreadCount = useMemo(() => (notifications || []).filter((n) => !n.read).length, [notifications]);

  const activeMeta = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0],
    [activeSection]
  );

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", padding: "110px 16px 60px", fontFamily: FONT }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* ==================== Header ==================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: 16, marginBottom: 26 }}>
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

          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden"
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
          {/* ---------- Sidebar ---------- */}
          <aside
            className={mobileNavOpen ? "block" : "hidden lg:block"}
            style={{
              width: "100%", maxWidth: 260, flexShrink: 0,
              background: "linear-gradient(160deg,#120c02,#080602)",
              border: "1px solid rgba(201,150,58,0.25)",
              borderRadius: 18, padding: 12,
              position: "sticky", top: 100,
            }}
          >
            <nav className="grid grid-cols-2 lg:grid-cols-1" style={{ gap: 6 }}>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setMobileNavOpen(false); }}
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
                  {s.id === "notifications" && unreadCount > 0 && (
                    <span
                      style={{
                        marginRight: "auto", minWidth: 18, height: 18, borderRadius: 9, padding: "0 4px",
                        background: activeSection === s.id ? "rgba(0,0,0,0.25)" : "linear-gradient(135deg,#ff6a6a,#d43b3b)",
                        color: "#fff", fontSize: 10.5, fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
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
                borderRadius: 18, padding: "24px 20px", minHeight: 340,
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
                <SectionLoading />
              ) : (
                <activeMeta.render
                  profile={profile}
                  email={email}
                  refreshProfile={loadProfile}
                  notify={notify}
                  notifications={notifications}
                  onNotificationClick={onNotificationClick}
                  onMarkAllRead={onMarkAllRead}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 1) الرئيسية
// ============================================================================
function HomeSection({ profile, notify }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getHomeSummary().then(setData);
  }, []);

  if (!data) return <SectionLoading />;

  const { subscription, lastReport, lastCampaign, lastPost, lastUpdate, performanceSummary } = data;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: 14, marginBottom: 24 }}>
        {/* حالة الاشتراك */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#888", fontSize: 12 }}>💳 حالة الاشتراك</span>
            <Badge text={subscription.status} />
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{subscription.planName}</div>
          <div style={{ color: "#888", fontSize: 11.5, marginTop: 6 }}>
            {subscription.renewsAt && subscription.renewsAt !== "غير محدد"
              ? `يتجدد بتاريخ ${subscription.renewsAt}${typeof subscription.daysLeft === "number" ? ` (${subscription.daysLeft} يومًا متبقية)` : ""}`
              : "لا يوجد تاريخ تجديد محدد"}
          </div>
        </Card>

        {/* آخر تقرير */}
        <Card>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>📄 آخر تقرير</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{lastReport.title}</div>
          <div style={{ color: "#888", fontSize: 11.5, marginTop: 6 }}>{lastReport.date} — {lastReport.note}</div>
        </Card>

        {/* آخر حملة */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#888", fontSize: 12 }}>📢 آخر حملة</span>
            <Badge text={lastCampaign.status} />
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{lastCampaign.name}</div>
          <div style={{ color: "#888", fontSize: 11.5, marginTop: 6 }}>{lastCampaign.platform} — إنفاق {lastCampaign.spend}</div>
        </Card>

        {/* آخر منشور */}
        <Card>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>📝 آخر منشور</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{lastPost.title}</div>
          <div style={{ color: "#888", fontSize: 11.5, marginTop: 6 }}>{lastPost.platform} — {lastPost.date} — {lastPost.engagement}</div>
        </Card>

        {/* آخر تحديث */}
        <Card>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>🔔 آخر تحديث</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13.5 }}>{lastUpdate.text}</div>
          <div style={{ color: "#888", fontSize: 11.5, marginTop: 6 }}>{lastUpdate.date}</div>
        </Card>

        {/* ملخص الأداء */}
        <Card>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>📊 ملخص الأداء</div>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <MiniStat label="الوصول" value={performanceSummary.reach.toLocaleString("en-US")} />
            <MiniStat label="نمو المتابعين" value={performanceSummary.followersGrowth} />
            <MiniStat label="التفاعل" value={`${performanceSummary.engagementRate}%`} />
            <MiniStat label="حملات نشطة" value={performanceSummary.activeCampaigns} />
          </div>
        </Card>
      </div>

      <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>روابط سريعة</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
        <QuickLink icon="📦" label="تصفح الباقات" onClick={() => goTo("gallery")} />
        <QuickLink icon="🖼️" label="معرض الأعمال" onClick={() => goTo("portfolio-gallery")} />
        <QuickLink icon="💬" label="تواصل معنا واتساب" onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank")} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const color = tone === "up" ? "#4ade80" : tone === "down" ? "#ff6b6b" : GOLD2;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ color, fontWeight: 900, fontSize: 14 }}>{value}</div>
      <div style={{ color: "#888", fontSize: 10.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ============================================================================
// 2) التحليلات
// ============================================================================
function AnalyticsSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAnalytics().then(setData);
  }, []);

  if (!data) return <SectionLoading />;
  if (!data.hasData) {
    return <EmptyState text="لسه مفيش تقرير تحليلات متاح لحسابك. هيظهر هنا أول ما فريقنا يجهّزه." />;
  }

  const { latest, trend, bestPosts, worstPosts, strengths, weaknesses, suggestions } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>آخر تحديث: {latest.periodLabel}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12 }}>
          <MiniStatCard icon="👁️" label="الوصول" value={latest.reach.toLocaleString("en-US")} />
          <MiniStatCard icon="💬" label="نسبة التفاعل" value={`${latest.engagementRate}%`} />
          <MiniStatCard icon="👥" label="المتابعين" value={latest.followersCount.toLocaleString("en-US")} />
          <MiniStatCard icon="🌐" label="زيارات الحساب" value={latest.profileVisits.toLocaleString("en-US")} />
        </div>
        {typeof latest.followersGrowth === "number" && (
          <p style={{ color: latest.followersGrowth >= 0 ? "#4ade80" : "#ff8080", fontSize: 12, fontWeight: 700, marginTop: 10 }}>
            {latest.followersGrowth >= 0 ? "▲" : "▼"} {Math.abs(latest.followersGrowth).toLocaleString("en-US")} متابع هذا الشهر
          </p>
        )}
      </div>

      {trend.length > 1 && (
        <div>
          <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 13.5, marginBottom: 14 }}>الأداء عبر الوقت</h4>
          <AnalyticsTrendChart trend={trend} />
        </div>
      )}

      {(bestPosts.length > 0 || worstPosts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
          <PostsCompareList title="أفضل المنشورات" icon="🏆" items={bestPosts} tone="good" />
          <PostsCompareList title="أسوأ المنشورات" icon="📉" items={worstPosts} tone="bad" />
        </div>
      )}

      {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20 }}>
          <InsightList title="نقاط القوة" icon="💪" items={strengths} color="#4ade80" />
          <InsightList title="نقاط الضعف" icon="⚠️" items={weaknesses} color="#facc15" />
          <InsightList title="اقتراحات الشهر القادم" icon="💡" items={suggestions} color={GOLD2} />
        </div>
      )}
    </div>
  );
}

function MiniStatCard({ icon, label, value }) {
  return (
    <Card style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 17, margin: "6px 0 2px" }}>{value}</div>
      <div style={{ color: "#888", fontSize: 11.5 }}>{label}</div>
    </Card>
  );
}

// ============================================================================
// 3) الأداء
// ============================================================================
function PerformanceSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getPerformance().then(setData);
  }, []);

  if (!data) return <SectionLoading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {data.kpis.map((k) => (
        <div key={k.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#eee", fontSize: 13, fontWeight: 700 }}>{k.label}</span>
            <span style={{ color: GOLD2, fontSize: 13, fontWeight: 800 }}>{k.value}{k.unit}</span>
          </div>
          <ProgressBar value={k.value} max={k.target} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 4) الحملات الإعلانية
// ============================================================================
function CampaignsSection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getCampaigns().then(setItems);
  }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد حملات إعلانية حاليًا." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
      {items.map((c) => (
        <Card key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{c.name}</div>
            <Badge text={c.status} />
          </div>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>{c.platform}</div>

          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8, textAlign: "center" }}>
            <MiniStat label="الميزانية" value={c.budget} />
            <MiniStat label="الإنفاق" value={c.spend} />
            <MiniStat label="الوصول (Reach)" value={c.reach} />
            <MiniStat label="مرات الظهور" value={c.impressions} />
            <MiniStat label="CTR" value={c.ctr} />
            <MiniStat label="CPC" value={c.cpc} />
            <MiniStat label="Leads" value={c.leads} />
            <MiniStat label="ROI" value={c.roi} tone={c.roiRaw > 0 ? "up" : c.roiRaw < 0 ? "down" : undefined} />
          </div>

          {c.notes && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#666", fontSize: 10.5, marginBottom: 4, fontWeight: 700 }}>📝 ملاحظات</div>
              <p style={{ color: "#ccc", fontSize: 12.5, lineHeight: 1.8 }}>{c.notes}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// 5) التقارير
// ============================================================================
function ReportsSection() {
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getReports().then(setItems);
  }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد تقارير بعد." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((r) => (
        <Card key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13.5 }}>{r.title}</div>
              <div style={{ color: "#888", fontSize: 11.5, marginTop: 4 }}>{r.date}</div>
            </div>
            <button
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(201,150,58,0.4)",
                background: "transparent", color: GOLD, fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              {openId === r.id ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            </button>
          </div>
          {openId === r.id && (
            <p style={{ color: "#ccc", fontSize: 12.5, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
              {r.summary}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// 6) الملفات
// ============================================================================
const FILE_ICONS = { pdf: "📄", image: "🖼️", video: "🎬", design: "🎨", sheet: "📊", default: "📁" };
const FILE_TYPE_LABELS = { pdf: "PDF", image: "صورة", video: "فيديو", design: "ملف تصميم", sheet: "جدول بيانات", default: "ملف" };
// الأنواع اللي المتصفح يقدر يعرضها مباشرة في نافذة معاينة (بدون تحميل)
const PREVIEWABLE_TYPES = ["image", "video", "pdf"];
const FILE_FILTERS = [
  { key: "all", label: "الكل", icon: "🗂️" },
  { key: "pdf", label: "PDF", icon: "📄" },
  { key: "image", label: "صور", icon: "🖼️" },
  { key: "video", label: "فيديو", icon: "🎬" },
  { key: "design", label: "تصميم", icon: "🎨" },
];

// بيضيف الامتداد الصحيح لاسم الملف لو ناقص، عشان التحميل يوصل باسم واضح
function fileNameForDownload(f) {
  if (/\.[a-zA-Z0-9]{1,5}$/.test(f.name || "")) return f.name;
  const urlExt = (f.url || "").split(".").pop()?.split("?")[0];
  return urlExt && urlExt.length <= 5 ? `${f.name || "ملف"}.${urlExt}` : f.name || "ملف";
}

function FilesSection() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    getFiles().then(setItems);
  }, []);

  async function handleDownload(f) {
    if (!f.url) return;
    const ok = await downloadClientFile(f.url, fileNameForDownload(f));
    if (!ok) window.open(f.url, "_blank", "noopener,noreferrer");
  }

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد ملفات مرفوعة بعد." />;

  const filtered = filter === "all" ? items : items.filter((f) => f.type === filter);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {FILE_FILTERS.map((ft) => (
          <button
            key={ft.key}
            onClick={() => setFilter(ft.key)}
            style={{
              padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${filter === ft.key ? GOLD : "rgba(255,255,255,0.1)"}`,
              background: filter === ft.key ? "rgba(201,150,58,0.12)" : "none",
              color: filter === ft.key ? GOLD3 : "#aaa",
            }}
          >
            {ft.icon} {ft.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="لا توجد ملفات في هذا التصنيف." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => {
            const canPreview = PREVIEWABLE_TYPES.includes(f.type) && !!f.url;
            return (
              <Card key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>{FILE_ICONS[f.type] || FILE_ICONS.default}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, wordBreak: "break-word" }}>{f.name}</div>
                    <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                      {FILE_TYPE_LABELS[f.type] || FILE_TYPE_LABELS.default} — {f.size} — {f.date}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {canPreview && (
                    <button
                      onClick={() => setPreviewFile(f)}
                      style={{
                        padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(201,150,58,0.35)",
                        background: "none", color: GOLD3, fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}
                    >
                      👁️ عرض
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(f)}
                    disabled={!f.url}
                    style={{
                      padding: "8px 16px", borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg,${GOLD},${GOLD2})`, color: "#000",
                      fontWeight: 800, fontSize: 12, cursor: f.url ? "pointer" : "not-allowed", opacity: f.url ? 1 : 0.5,
                    }}
                  >
                    ⬇️ تحميل
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={async (f) => {
            const ok = await downloadClientFile(f.url, fileNameForDownload(f));
            if (!ok) {
              window.open(f.url, "_blank", "noopener,noreferrer");
              setToastMsg("تم فتح الملف في نافذة جديدة لتحميله");
              setTimeout(() => setToastMsg(""), 2500);
            }
          }}
        />
      )}

      {toastMsg && <Toast toast={{ type: "success", text: toastMsg }} onClose={() => setToastMsg("")} />}
    </div>
  );
}

// ============================================================================
// 7) السكربتات
// ============================================================================
function ScriptsSection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getScripts().then(setItems);
  }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد سكربتات حاليًا." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((s) => (
        <Card key={s.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 13.5 }}>{s.title}</div>
            <Badge text={s.status} />
          </div>
          <div style={{ color: "#888", fontSize: 11.5, marginBottom: 8 }}>{s.platform}</div>
          <p style={{ color: "#ccc", fontSize: 12.5, margin: 0 }}>{s.excerpt}</p>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// 8) الملاحظات
// ============================================================================
function NotesSection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getNotes().then(setItems);
  }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد ملاحظات حاليًا." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((n) => (
        <Card key={n.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: GOLD2, fontWeight: 800, fontSize: 12.5 }}>{n.author}</span>
            <span style={{ color: "#888", fontSize: 11 }}>{n.date}</span>
          </div>
          <p style={{ color: "#ddd", fontSize: 13, margin: 0 }}>{n.text}</p>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// 8.5) الاشتراكات — package_subscriptions (services/subscriptionService.js)
// ============================================================================
function SubscriptionCard({ sub, notify, onChanged }) {
  const [renewing, setRenewing] = useState(false);

  async function handleRenew() {
    setRenewing(true);
    try {
      const { whatsappLink } = await requestRenewal(sub.id);
      window.open(whatsappLink, "_blank");
      notify("success", "تم إرسال طلب التجديد ✅ في انتظار موافقة الأدمن.");
      onChanged();
    } catch (err) {
      notify("error", err.message || "تعذّر إرسال طلب التجديد.");
    } finally {
      setRenewing(false);
    }
  }

  const canRenew = sub.status === "active" || sub.status === "expired";

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>📦 {sub.packageName}</div>
          {sub.businessName && <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{sub.businessName}</div>}
        </div>
        <Badge text={sub.statusLabel} />
      </div>

      <div className="grid grid-cols-2" style={{ gap: 8, marginBottom: 10 }}>
        <MiniStat label="تاريخ البداية" value={sub.startDateLabel} />
        <MiniStat label="تاريخ الانتهاء" value={sub.endDateLabel} />
      </div>

      {sub.status === "active" && typeof sub.daysLeft === "number" && (
        <p style={{ color: sub.daysLeft <= 5 ? "#facc15" : "#888", fontSize: 12, marginBottom: 10 }}>
          ⏳ متبقّي {Math.max(0, sub.daysLeft)} يوم على انتهاء الاشتراك
        </p>
      )}

      <div style={{ color: GOLD2, fontWeight: 800, fontSize: 14, marginBottom: canRenew ? 12 : 0 }}>
        {sub.finalPrice.toLocaleString()} ج.م
        {sub.discountAmount > 0 && (
          <span style={{ color: "#888", fontWeight: 600, fontSize: 11.5 }}> (بعد خصم {sub.discountAmount.toLocaleString()} ج.م)</span>
        )}
      </div>

      {canRenew && (
        <button
          onClick={handleRenew}
          disabled={renewing}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10, cursor: renewing ? "not-allowed" : "pointer",
            border: "1px solid rgba(201,150,58,0.4)", background: "transparent", color: GOLD,
            fontWeight: 800, fontSize: 12.5, fontFamily: FONT,
          }}
        >
          {renewing ? "جاري الإرسال..." : "🔄 تجديد الاشتراك"}
        </button>
      )}
    </Card>
  );
}

function SubscriptionsSection({ notify }) {
  const [items, setItems] = useState(null);

  function load() {
    fetchMySubscriptions().then(setItems).catch(() => setItems([]));
  }

  useEffect(() => { load(); }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) {
    return (
      <div>
        <EmptyState text="لا يوجد اشتراكات حتى الآن." />
        <div style={{ marginTop: 14 }}>
          <QuickLink icon="📦" label="تصفّح الباقات واشترك دلوقتي" onClick={() => goTo("gallery")} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
      {items.map((sub) => (
        <SubscriptionCard key={sub.id} sub={sub} notify={notify} onChanged={load} />
      ))}
    </div>
  );
}

// ============================================================================
// 9) الفواتير
// ============================================================================
function InvoicesSection() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getInvoices().then(setItems);
  }, []);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد فواتير بعد." />;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(201,150,58,0.25)" }}>
            {["رقم الفاتورة", "التاريخ", "المبلغ", "الحالة"].map((h) => (
              <th key={h} style={{ textAlign: "right", padding: "10px 8px", color: "#888", fontSize: 11.5, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((inv) => (
            <tr key={inv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <td style={{ padding: "12px 8px", color: "#fff", fontSize: 13, fontWeight: 700 }}>{inv.number}</td>
              <td style={{ padding: "12px 8px", color: "#ccc", fontSize: 12.5 }}>{inv.date}</td>
              <td style={{ padding: "12px 8px", color: GOLD2, fontSize: 12.5, fontWeight: 700 }}>{inv.amount}</td>
              <td style={{ padding: "12px 8px" }}><Badge text={inv.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 10) الإشعارات
// ============================================================================
function NotificationsSection({ notifications, onNotificationClick, onMarkAllRead }) {
  const items = notifications;
  const hasUnread = (items || []).some((n) => !n.read);

  if (!items) return <SectionLoading />;
  if (items.length === 0) return <EmptyState text="لا توجد إشعارات جديدة." />;

  return (
    <div>
      {hasUnread && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
          <button
            onClick={onMarkAllRead}
            style={{
              background: "none", border: "1px solid rgba(201,150,58,0.35)", borderRadius: 10,
              padding: "7px 12px", color: GOLD2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            }}
          >
            تعليم الكل كمقروء
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((n) => {
          const clickable = !n.read || (n.linkType && n.linkId);
          return (
            <button
              key={n.id}
              onClick={() => clickable && onNotificationClick(n)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                background: n.read ? "rgba(255,255,255,0.02)" : "rgba(201,150,58,0.08)",
                border: `1px solid ${n.read ? "rgba(255,255,255,0.06)" : "rgba(201,150,58,0.3)"}`,
                width: "100%", textAlign: "right", cursor: clickable ? "pointer" : "default", fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 18 }}>{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: n.read ? 600 : 800 }}>{n.title}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{n.date}</div>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 11) الملف الشخصي (قابل للتعديل)
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
// سجل الأقسام — أضف هنا أي قسم جديد
// ============================================================================
const SECTIONS = [
  { id: "home", label: "الرئيسية", icon: "🏠", subtitle: "ملخص شامل لحالة حسابك", render: HomeSection },
  { id: "subscriptions", label: "اشتراكاتي", icon: "📦", subtitle: "باقاتك، حالة الاشتراك، وتجديدها", render: SubscriptionsSection },
  { id: "analytics", label: "التحليلات", icon: "📈", subtitle: "أرقام الوصول والتفاعل والمتابعين", render: AnalyticsSection },
  { id: "performance", label: "الأداء", icon: "🎯", subtitle: "مؤشرات الأداء الرئيسية مقابل أهدافك", render: PerformanceSection },
  { id: "campaigns", label: "الحملات الإعلانية", icon: "📢", subtitle: "حملاتك النشطة والمنتهية", render: CampaignsSection },
  { id: "reports", label: "التقارير", icon: "📄", subtitle: "التقارير الدورية لأداء حسابك", render: ReportsSection },
  { id: "files", label: "الملفات", icon: "🗂️", subtitle: "التصميمات والفيديوهات والمستندات الخاصة بك", render: FilesSection },
  { id: "scripts", label: "السكربتات", icon: "✍️", subtitle: "نصوص الإعلانات والمحتوى", render: ScriptsSection },
  { id: "notes", label: "الملاحظات", icon: "🗒️", subtitle: "ملاحظات وتحديثات فريق العمل", render: NotesSection },
  { id: "invoices", label: "الفواتير", icon: "🧾", subtitle: "سجل فواتيرك وحالة الدفع", render: InvoicesSection },
  { id: "notifications", label: "الإشعارات", icon: "🔔", subtitle: "كل جديد يخص حسابك", render: NotificationsSection },
  { id: "profile", label: "الملف الشخصي", icon: "👤", subtitle: "عدّل بياناتك الشخصية وكلمة المرور", render: ProfileSection },
];
