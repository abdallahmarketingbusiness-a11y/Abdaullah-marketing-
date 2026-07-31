// src/components/PortfolioGallery.jsx
import { useEffect, useState } from "react";
import { GOLD, GOLD3, BG, FONT } from "../config/theme";
import { fetchPortfolioItems, fetchDistinctCategories } from "../services/portfolioService";
import PortfolioLightbox from "./PortfolioLightbox";

export default function PortfolioGallery() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    fetchDistinctCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPortfolioItems({ search, category, page })
      .then((res) => {
        setItems(res.items);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [search, category, page]);

  return (
    <div dir="rtl" style={{ background: BG, minHeight: "100vh", paddingTop: 110, paddingBottom: 60 }}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 style={{ fontFamily: FONT, fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: "#fff", marginBottom: 8, textAlign: "center" }}>
          🎨 معرض الأعمال
        </h1>
        <p style={{ color: "#888", textAlign: "center", marginBottom: 30 }}>تصفح مجموعة مختارة من أعمالنا</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 30 }}>
          <input
            placeholder="🔍 ابحث عن تصميم..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)",
              borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 13, outline: "none", minWidth: 220,
            }}
          />
          <select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,150,58,0.2)",
              borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 13, outline: "none",
            }}
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "#888", textAlign: "center" }}>جاري التحميل...</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center" }}>لا توجد أعمال مطابقة.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const hovered = hoverId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setOpenItem(item)}
                  onMouseEnter={() => setHoverId(item.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(201,150,58,0.2)",
                    background: "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transform: hovered ? "translateY(-6px)" : "translateY(0)",
                    boxShadow: hovered ? "0 18px 40px rgba(0,0,0,0.5)" : "none",
                    transition: "transform .25s ease, box-shadow .25s ease",
                  }}
                >
                  <div style={{ position: "relative", height: 190, overflow: "hidden" }}>
                    {item.main_image_url && (
                      <img
                        src={item.main_image_url}
                        alt={item.title}
                        loading="lazy"
                        style={{
                          width: "100%", height: "100%", objectFit: "cover",
                          transform: hovered ? "scale(1.08)" : "scale(1)",
                          transition: "transform .35s ease",
                        }}
                      />
                    )}
                    {item.is_featured && (
                      <span style={{ position: "absolute", top: 10, right: 10, background: GOLD, color: "#000", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 8 }}>
                        ⭐ مميز
                      </span>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{item.title}</h3>
                    <p style={{ color: "#888", fontSize: 12.5, marginBottom: 8, minHeight: 34 }}>{item.short_description}</p>
                    <span style={{ fontSize: 11, color: GOLD3, border: "1px solid rgba(201,150,58,0.3)", borderRadius: 8, padding: "3px 10px" }}>
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 30 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: `1px solid ${p === page ? GOLD : "rgba(255,255,255,0.15)"}`,
                  background: p === page ? GOLD : "none", color: p === page ? "#000" : "#aaa", fontWeight: 700, cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {openItem && <PortfolioLightbox item={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  );
}
