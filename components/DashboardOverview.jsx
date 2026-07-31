// src/components/DashboardOverview.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD3, FONT } from "../config/theme";
import { fetchDashboardStats } from "../services/aboutService";

function StatCard({ label, value, icon }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(201,150,58,0.25)", background: "rgba(255,255,255,0.02)", padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", margin: "6px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  if (!stats) return <p style={{ color: "#888" }}>جاري تحميل الإحصائيات...</p>;

  return (
    <div dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
        <StatCard label="عدد الأعمال" value={stats.portfolioCount} icon="🖼️" />
        <StatCard label="عدد الشهادات" value={stats.testimonialsCount} icon="🎓" />
        <StatCard label="طلبات التصميم" value={stats.requestsCount} icon="📩" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 style={{ color: GOLD3, fontWeight: 800, marginBottom: 10, fontSize: 14 }}>👁️ الأكثر مشاهدة</h4>
          {stats.topViewed.length === 0 ? (
            <p style={{ color: "#666", fontSize: 12.5 }}>لا توجد بيانات بعد.</p>
          ) : (
            stats.topViewed.map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span>{it.title}</span>
                <span style={{ color: GOLD }}>{it.views_count || 0}</span>
              </div>
            ))
          )}
        </div>
        <div>
          <h4 style={{ color: GOLD3, fontWeight: 800, marginBottom: 10, fontSize: 14 }}>📩 الأكثر طلبًا</h4>
          {stats.topRequested.length === 0 ? (
            <p style={{ color: "#666", fontSize: 12.5 }}>لا توجد بيانات بعد.</p>
          ) : (
            stats.topRequested.map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span>{it.title}</span>
                <span style={{ color: GOLD }}>{it.requests_count || 0}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
