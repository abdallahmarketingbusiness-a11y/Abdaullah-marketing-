// src/pages/PackageDetails.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, BG, FONT } from "../config/theme";
import { fetchPackageById } from "../services/packagesService";
import SubscribeModal from "./SubscribeModal";

function Row({ label, value }) {
  if (value === undefined || value === null || value === "" || value === 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: "#999", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, textAlign: "left" }}>{value}</span>
    </div>
  );
}

function listOn(obj, isBool) {
  if (!obj) return null;
  const keys = Object.keys(obj).filter((k) => (isBool ? obj[k] : obj[k]?.on));
  return keys.length ? keys.join("، ") : null;
}

export default function PackageDetails({ packageId, onUseAsNew, onBack }) {
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPackageById(packageId)
      .then(setPkg)
      .catch(() => setErrorMsg("تعذّر تحميل تفاصيل الباقة."))
      .finally(() => setLoading(false));
  }, [packageId]);

  function buildWhatsAppLink() {
    if (!pkg) return "#";
    const lines = [
      "السلام عليكم.",
      "شفت الباقة دي وحابب أستفسر عنها:",
      "",
      `اسم الباقة: ${pkg.package_name}`,
      `النشاط: ${pkg.business_name} (${pkg.business_type})`,
      `السعر النهائي: ${(pkg.final_price || 0).toLocaleString()} ج.م`,
    ];
    return `https://wa.me/201069032563?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", paddingTop: 110, paddingBottom: 60 }}>
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
        >
          → رجوع للباقات المخصصة
        </button>

        {loading && <p style={{ color: "#888" }}>جاري التحميل...</p>}
        {errorMsg && <p style={{ color: "#ff8080" }}>{errorMsg}</p>}

        {pkg && (
          <div
            style={{
              background: "linear-gradient(160deg,#120c02,#080602)",
              border: "1px solid rgba(201,150,58,0.3)",
              borderRadius: 20,
              padding: "26px 24px",
            }}
          >
            <h1 style={{ fontFamily: FONT, fontSize: "clamp(22px,3.5vw,30px)", fontWeight: 900, color: "#fff", marginBottom: 4 }}>
              📦 {pkg.package_name}
            </h1>
            <p style={{ color: "#999", fontSize: 14, marginBottom: 20 }}>
              🏢 {pkg.business_name} &nbsp;·&nbsp; 🏷️ {pkg.business_type}
            </p>

            <Row label="الباقة الأساسية" value={pkg.base_package_tier} />
            <Row label="عدد البوستات" value={pkg.posts_count} />
            <Row label="عدد الستوري" value={pkg.stories_count} />
            <Row label="عدد الريلز" value={pkg.reels_count} />
            <Row label="عدد السكربتات" value={pkg.scripts_count} />
            <Row label="نوع الموقع" value={listOn(pkg.builder_state?.websites)} />
            <Row label="المنصات" value={Object.keys(pkg.builder_state?.platforms || {}).join("، ") || null} />
            <Row label="صفحات السوشيال ميديا" value={listOn(pkg.builder_state?.socialPages, true)} />
            <Row
              label="الهوية البصرية"
              value={pkg.builder_state?.identityOn ? "نعم" : null}
            />
            <Row label="الإعلانات" value={listOn(pkg.builder_state?.ads, true)} />
            <Row label="ملاحظات العميل" value={pkg.client_notes} />
            <Row label="تاريخ الإنشاء" value={new Date(pkg.created_at).toLocaleDateString("ar-EG")} />
            <Row label="آخر تعديل" value={new Date(pkg.updated_at).toLocaleDateString("ar-EG")} />

            <div style={{ borderTop: "1px solid rgba(201,150,58,0.2)", marginTop: 16, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: "#999", fontSize: 13, fontWeight: 700 }}>السعر النهائي</span>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 26, fontWeight: 900, color: GOLD3 }}>
                {(pkg.final_price || 0).toLocaleString()} <span style={{ fontSize: 12, color: "#999" }}>ج.م</span>
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowSubscribe(true)}
                style={{
                  flex: "1 1 200px", padding: "13px 0", borderRadius: 12, border: "none",
                  fontWeight: 900, fontSize: 14, cursor: "pointer", color: "#000",
                  background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
                }}
              >
                🚀 اشترك الآن
              </button>
              <button
                onClick={() => onUseAsNew(pkg)}
                style={{
                  flex: "1 1 160px", padding: "13px 0", borderRadius: 12, textAlign: "center",
                  fontWeight: 800, fontSize: 14, cursor: "pointer", color: GOLD,
                  border: "1px solid rgba(201,150,58,0.4)", background: "transparent",
                }}
              >
                📄 استخدام هذه الباقة
              </button>
              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: "1 1 160px", padding: "13px 0", borderRadius: 12, textAlign: "center",
                  fontWeight: 800, fontSize: 14, textDecoration: "none", color: GOLD,
                  border: "1px solid rgba(201,150,58,0.4)",
                }}
              >
                📲 واتساب
              </a>
            </div>
          </div>
        )}

        {showSubscribe && pkg && (
          <SubscribeModal
            pkg={pkg}
            initialCoupon={typeof window !== "undefined" ? sessionStorage.getItem("am_coupon_code") || "" : ""}
            onClose={() => setShowSubscribe(false)}
            onSubscribed={() => { window.location.hash = "#dashboard"; }}
          />
        )}
      </div>
    </div>
  );
}
