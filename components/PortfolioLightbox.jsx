// src/components/PortfolioLightbox.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD2, GOLD3, FONT } from "../config/theme";
import {
  fetchPortfolioImages, incrementViews, logDesignRequest, buildWhatsappOrderMessage,
} from "../services/portfolioService";
import { fetchSiteSettings } from "../services/aboutService";

const FALLBACK_WHATSAPP = "201069032563";

export default function PortfolioLightbox({ item, onClose }) {
  const [images, setImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(FALLBACK_WHATSAPP);

  useEffect(() => {
    incrementViews(item.id);
    fetchPortfolioImages(item.id).then((imgs) => {
      const all = [{ image_url: item.main_image_url }, ...imgs];
      setImages(all);
    });
    fetchSiteSettings()
      .then((s) => {
        if (s?.whatsapp_numbers?.length) setWhatsappNumber(s.whatsapp_numbers[0]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOrderSimilar() {
    logDesignRequest(item.id);
    const pageUrl = `${window.location.origin}${window.location.pathname}#portfolio?id=${item.id}`;
    const url = buildWhatsappOrderMessage(item, { whatsappNumber, pageUrl });
    window.open(url, "_blank");
  }

  const active = images[activeIndex] || { image_url: item.main_image_url };

  return (
    <div
      dir="rtl"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 900, maxHeight: "92vh", overflowY: "auto",
          background: "#0c0c0c", border: "1px solid rgba(201,150,58,0.3)", borderRadius: 20,
        }}
      >
        <div style={{ position: "relative", background: "#000" }}>
          <img
            src={active.image_url}
            alt={item.title}
            onClick={() => setZoomed((z) => !z)}
            style={{
              width: "100%", maxHeight: 480, objectFit: "contain", cursor: zoomed ? "zoom-out" : "zoom-in",
              transform: zoomed ? "scale(1.5)" : "scale(1)", transition: "transform .25s ease", display: "block", margin: "0 auto",
            }}
          />
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 18, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {images.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: "12px 20px", overflowX: "auto" }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img.image_url}
                loading="lazy"
                decoding="async"
                onClick={() => {
                  setActiveIndex(i);
                  setZoomed(false);
                }}
                style={{
                  width: 60, height: 60, objectFit: "cover", borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: i === activeIndex ? `2px solid ${GOLD}` : "2px solid transparent",
                }}
              />
            ))}
          </div>
        )}

        <div style={{ padding: "6px 24px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 22 }}>{item.title}</h2>
            <span style={{ fontSize: 12, color: GOLD3, border: "1px solid rgba(201,150,58,0.3)", borderRadius: 8, padding: "4px 12px" }}>
              {item.category}
            </span>
          </div>

          {item.client_name && <p style={{ color: "#888", fontSize: 13, marginTop: 6 }}>👤 العميل: {item.client_name}</p>}

          <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.9, marginTop: 14 }}>
            {item.full_description || item.short_description}
          </p>

          {item.video_url && (
            <div style={{ marginTop: 16 }}>
              <video src={item.video_url} controls style={{ width: "100%", borderRadius: 12 }} />
            </div>
          )}

          <button
            onClick={handleOrderSimilar}
            style={{
              marginTop: 22, width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              fontWeight: 900, fontSize: 15, color: "#000", cursor: "pointer",
              background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            }}
          >
            💬 اطلب تصميم مشابه
          </button>
        </div>
      </div>
    </div>
  );
}
