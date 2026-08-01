// src/components/TestimonialsSection.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD3, FONT } from "../config/theme";
import { fetchVisibleTestimonials } from "../services/testimonialsService";

export default function TestimonialsSection() {
  const [items, setItems] = useState([]);
  const [zoomed, setZoomed] = useState(null);

  useEffect(() => {
    fetchVisibleTestimonials().then(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div dir="rtl" style={{ marginTop: 50 }}>
      <h3 style={{ fontFamily: FONT, color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 18, textAlign: "center" }}>
        🎓 الشهادات
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((t) => (
          <div
            key={t.id}
            style={{ borderRadius: 16, border: "1px solid rgba(201,150,58,0.2)", background: "rgba(255,255,255,0.02)", padding: 16 }}
          >
            {t.image_url && (
              <img
                src={t.image_url}
                alt={t.certificate_name}
                loading="lazy"
                decoding="async"
                onClick={() => setZoomed(t)}
                style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 10, cursor: "zoom-in" }}
              />
            )}
            <h4 style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{t.certificate_name}</h4>
            <p style={{ color: "#888", fontSize: 12.5, margin: "4px 0" }}>{t.issuer}{t.issue_date ? ` · ${t.issue_date}` : ""}</p>
            {t.verify_url && (
              <a href={t.verify_url} target="_blank" rel="noreferrer" style={{ color: GOLD3, fontSize: 12 }}>
                🔗 رابط التحقق
              </a>
            )}
          </div>
        ))}
      </div>

      {zoomed && (
        <div
          onClick={() => setZoomed(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <img src={zoomed.image_url} alt={zoomed.certificate_name} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
