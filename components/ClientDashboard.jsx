// src/components/ClientDashboard.jsx
// ملاحظة: دي نسخة placeholder بس عشان نتأكد إن نظام الدخول شغال من الأول للآخر.
// المحتوى الحقيقي للوحة التحكم (مشاريع، فواتير، حالة الطلبات..) ده مرحلة تانية منفصلة.
import { useEffect, useState } from "react";
import { GOLD, GOLD2, BG, FONT } from "../config/theme";
import { getClientProfile } from "../services/clientAuthService";

export default function ClientDashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", padding: "120px 20px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", background: "linear-gradient(160deg,#120c02,#080602)", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20, padding: "30px 26px" }}>
        <h1 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6 }}>
          {loading ? "..." : `أهلاً ${profile?.full_name || ""}`}
        </h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>لوحة تحكم العميل — قريبًا هتقدر تتابع مشاريعك وباقاتك من هنا.</p>

        <button
          onClick={onLogout}
          style={{
            padding: "11px 22px", borderRadius: 12, border: "1px solid rgba(201,150,58,0.4)",
            fontWeight: 700, fontSize: 13, cursor: "pointer", color: GOLD, background: "transparent",
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
