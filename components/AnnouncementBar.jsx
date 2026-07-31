// src/components/AnnouncementBar.jsx
// شريط الإشعار/العرض العلوي — بيظهر فوق كل صفحات الموقع لما يكون فيه إعلان مفعّل
// من السوبر ادمن. بيقفل يدويًا بزرار X، أو تلقائيًا بعد دقيقتين لو محدش قفله.
import { useEffect, useState } from "react";
import { GOLD, GOLD2 } from "../config/theme";
import { fetchAnnouncement } from "../services/aboutService";

const AUTO_DISMISS_MS = 2 * 60 * 1000; // دقيقتين

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchAnnouncement()
      .then((data) => {
        if (data && data.is_active && data.message) {
          setAnnouncement(data);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!announcement || !visible) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
        background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
        color: "#000",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontSize: 13.5,
        fontWeight: 700,
        boxShadow: "0 2px 20px rgba(201,150,58,0.3)",
        animation: "fadeUp .35s ease both",
        flexWrap: "wrap",
        textAlign: "center",
      }}
    >
      <span>📣 {announcement.message}</span>
      {announcement.link_url && (
        <a
          href={announcement.link_url}
          target="_blank"
          rel="noreferrer"
          style={{
            textDecoration: "underline",
            fontWeight: 800,
            color: "#000",
            whiteSpace: "nowrap",
          }}
        >
          {announcement.link_label || "اعرف أكتر"} ←
        </a>
      )}
      <button
        onClick={() => setVisible(false)}
        aria-label="إغلاق الإشعار"
        style={{
          background: "rgba(0,0,0,0.15)",
          border: "none",
          borderRadius: "50%",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#000",
          fontSize: 13,
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
