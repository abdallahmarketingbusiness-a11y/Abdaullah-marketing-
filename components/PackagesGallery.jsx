// src/pages/PackagesGallery.jsx
import { useEffect, useState, useCallback } from "react";
import { GOLD, GOLD2, GOLD3, BG, FONT } from "../config/theme";
import { GALLERY } from "../config/packagesConfig";
import { fetchPackages, fetchDistinctBusinessTypes } from "../services/packagesService";

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        padding: 20,
        height: 210,
      }}
    >
      {[70, 45, 90, 60].map((w, i) => (
        <div
          key={i}
          style={{
            width: `${w}%`,
            height: 14,
            borderRadius: 6,
            marginBottom: 14,
            background: "rgba(255,255,255,0.06)",
            animation: "pulseSkeleton 1.4s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function PackageCard({ pkg, onOpen }) {
  const isFeatured = pkg.status === "featured";
  return (
    <div
      onClick={() => onOpen(pkg.id)}
      className="transition-all duration-300 hover:-translate-y-1"
      style={{
        cursor: "pointer",
        position: "relative",
        borderRadius: 18,
        border: `1px solid ${isFeatured ? "rgba(201,150,58,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: isFeatured
          ? "linear-gradient(160deg,#1a1206,#0a0704)"
          : "rgba(255,255,255,0.02)",
        padding: 22,
        boxShadow: isFeatured ? "0 8px 30px rgba(201,150,58,0.15)" : "none",
      }}
    >
      {isFeatured && (
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            fontSize: 11,
            fontWeight: 800,
            color: "#000",
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          ⭐ مميزة
        </span>
      )}
      <h3 style={{ fontFamily: FONT, fontSize: 17, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
        📦 {pkg.package_name}
      </h3>
      <p style={{ color: "#999", fontSize: 13, marginBottom: 14 }}>
        🏢 {pkg.business_name} &nbsp;·&nbsp; 🏷️ {pkg.business_type}
      </p>
      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.9 }}>
        <div>🛠️ عدد الخدمات: {countServices(pkg)}</div>
        <div>📅 أُنشئت: {formatDate(pkg.created_at)}</div>
        <div>📅 آخر تعديل: {formatDate(pkg.updated_at)}</div>
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ color: "#777", fontSize: 12 }}>السعر النهائي</span>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 20, fontWeight: 900, color: GOLD3 }}>
          {(pkg.final_price || 0).toLocaleString()} <span style={{ fontSize: 11, color: "#999" }}>ج.م</span>
        </span>
      </div>
    </div>
  );
}

function countServices(pkg) {
  const s = pkg.builder_state || {};
  let n = 0;
  if (pkg.posts_count) n++;
  if (pkg.stories_count) n++;
  if (pkg.reels_count) n++;
  if (pkg.scripts_count) n++;
  n += Object.values(s.websites || {}).filter((w) => w?.on).length;
  n += Object.keys(s.platforms || {}).length;
  n += Object.values(s.socialPages || {}).filter(Boolean).length;
  n += Object.values(s.ads || {}).filter(Boolean).length;
  if (s.logo?.on) n++;
  if (s.brand?.on) n++;
  if (s.aiVideo?.on) n++;
  return n;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

export default function PackagesGallery({ onOpenPackage, onCreateNew, onBack }) {
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [coupon, setCoupon] = useState(
    typeof window !== "undefined" ? sessionStorage.getItem("am_coupon_code") || "" : ""
  );

  function handleCouponChange(v) {
    setCoupon(v);
    if (typeof window !== "undefined") {
      if (v.trim()) sessionStorage.setItem("am_coupon_code", v.trim());
      else sessionStorage.removeItem("am_coupon_code");
    }
  }

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchPackages({ search, businessType, sort, page });
      setItems(res.items);
      setTotalPages(res.totalPages);
    } catch (e) {
      setErrorMsg("تعذّر تحميل الباقات. تأكد من إعداد Supabase وحاول تاني.");
    } finally {
      setLoading(false);
    }
  }, [search, businessType, sort, page]);

  useEffect(() => {
    fetchDistinctBusinessTypes().then(setBusinessTypes).catch(() => {});
  }, []);

  // بحث لحظي مع debounce بسيط
  useEffect(() => {
    setPage(1);
  }, [search, businessType, sort]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", paddingTop: 110, paddingBottom: 60 }}>
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
        >
          → رجوع للرئيسية
        </button>

        <h1 style={{ fontFamily: FONT, fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
          <span style={{ background: `linear-gradient(135deg,${GOLD},${GOLD3})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📁 الباقات المخصصة
          </span>
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 26 }}>
          تصفّح باقات جاهزة صممها عملاء تانيين، أو ابدأ باقتك من الصفر
        </p>

        {/* كود خصم — بيتحفظ ويترشّح تلقائيًا مع أي باقة هتختارها وتشترك فيها */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            border: "1px dashed rgba(201,150,58,0.35)", borderRadius: 12,
            background: "rgba(201,150,58,0.05)", padding: "12px 16px", marginBottom: 18,
          }}
        >
          <span style={{ color: GOLD3, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>🏷️ عندك كود خصم؟</span>
          <input
            value={coupon}
            onChange={(e) => handleCouponChange(e.target.value)}
            placeholder="اكتب الكود هنا (اختياري)"
            style={{
              flex: "1 1 200px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(201,150,58,0.25)",
              borderRadius: 8, padding: "9px 12px",
              color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <span style={{ color: "#888", fontSize: 11.5 }}>هيتطبّق تلقائيًا لما تختار باقة وتدوس "اشترك الآن"</span>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث باسم النشاط أو الباقة أو نوع النشاط..."
            style={{
              flex: "1 1 260px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(201,150,58,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={selectStyle}
          >
            <option value="all" disabled>الترتيب</option>
            {GALLERY.sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            style={selectStyle}
          >
            <option value="all">جميع الباقات</option>
            {businessTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <p style={{ color: "#ff8080", fontSize: 13, marginBottom: 20 }}>{errorMsg}</p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p style={{ color: "#999", fontSize: 15, marginBottom: 22 }}>لا توجد باقات مخصصة حتى الآن.</p>
            <button
              onClick={onCreateNew}
              style={{
                padding: "12px 26px",
                borderRadius: 12,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                color: "#000",
                background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
              }}
            >
              ✨ كن أول من ينشئ باقة مخصصة
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onOpen={onOpenPackage} />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 34 }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    style={{
                      width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(201,150,58,0.25)",
                      background: page === i + 1 ? GOLD : "transparent",
                      color: page === i + 1 ? "#000" : "#aaa",
                      fontWeight: 800, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes pulseSkeleton { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}

const selectStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(201,150,58,0.2)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#ddd",
  fontSize: 13,
  outline: "none",
};
