// src/components/FilePreviewModal.jsx
//
// نافذة معاينة ملف من قسم "الملفات" في لوحة تحكم العميل — بدون الخروج من
// الصفحة. بيدعم معاينة فعلية لـ: صورة (zoom) / فيديو (player) / PDF (iframe).
// لباقي الأنواع (ملف تصميم / جدول بيانات / ملف عام) مفيش معاينة متصفح ممكنة،
// فبيظهر بس زرار التحميل — نفس أسلوب components/PortfolioLightbox.jsx.

import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";

export default function FilePreviewModal({ file, onClose, onDownload }) {
  const [zoomed, setZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDownloadClick() {
    setDownloading(true);
    try {
      await onDownload(file);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      dir="rtl"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: file.type === "pdf" ? 980 : 860, maxHeight: "92vh", overflowY: "auto",
          background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20,
        }}
      >
        <div style={{ position: "relative", background: "#000", minHeight: 120 }}>
          {file.type === "image" && (
            <img
              src={file.url}
              alt={file.name}
              onClick={() => setZoomed((z) => !z)}
              style={{
                width: "100%", maxHeight: 560, objectFit: "contain", display: "block", margin: "0 auto",
                cursor: zoomed ? "zoom-out" : "zoom-in",
                transform: zoomed ? "scale(1.5)" : "scale(1)", transition: "transform .25s ease",
              }}
            />
          )}

          {file.type === "video" && (
            <video src={file.url} controls autoPlay style={{ width: "100%", maxHeight: 560, display: "block" }} />
          )}

          {file.type === "pdf" && (
            <iframe
              src={file.url}
              title={file.name}
              style={{ width: "100%", height: "72vh", border: "none", display: "block" }}
            />
          )}

          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: 10,
              border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 18, cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "18px 24px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 18, wordBreak: "break-word" }}>
              {file.name}
            </h2>
            <span style={{ fontSize: 12, color: GOLD3, border: "1px solid rgba(201,150,58,0.3)", borderRadius: 8, padding: "4px 12px", whiteSpace: "nowrap" }}>
              {file.size} · {file.date}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12,
                border: "1px solid rgba(201,150,58,0.35)", color: GOLD3, fontWeight: 700, fontSize: 13,
                textDecoration: "none",
              }}
            >
              🔗 فتح في نافذة جديدة
            </a>
            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontWeight: 800, fontSize: 13, color: "#000",
                background: `linear-gradient(135deg,${GOLD},${GOLD2})`, opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? "⏳ جاري التحميل..." : "⬇️ تحميل"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
