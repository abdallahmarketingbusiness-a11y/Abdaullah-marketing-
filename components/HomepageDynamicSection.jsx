// src/components/HomepageDynamicSection.jsx
import { GOLD, GOLD2 } from "../config/theme";

// قسم عام لأي محتوى يضيفه الأدمن (بانر / عرض / خصم / إعلان / نص) —
// يتصمم بشكل بانر ترويجي واحد بيتناسب مع باقي الموقع.
export default function HomepageDynamicSection({ section }) {
  const c = section.content || {};
  const hasImage = !!c.image_url;

  return (
    <section dir="rtl" className="py-16 px-6 md:px-10" style={{ background: "transparent" }}>
      <div
        className="max-w-5xl mx-auto rounded-3xl overflow-hidden border relative"
        style={{ background: "#161616", borderColor: "rgba(201,150,58,0.25)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div className={`grid grid-cols-1 ${hasImage ? "lg:grid-cols-2" : ""}`}>
          {hasImage && (
            <div className="relative h-56 lg:h-full min-h-[220px]" style={{ background: "#0A0A0A" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image_url} alt={c.title || ""} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8 md:p-10 text-center lg:text-right">
            {c.badge_text && (
              <span
                className="inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(201,150,58,0.95)", color: "#000" }}
              >
                {c.badge_text}
              </span>
            )}
            {c.eyebrow && (
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: GOLD }}>
                {c.eyebrow}
              </div>
            )}
            {c.title && (
              <h3 className="text-2xl md:text-3xl font-black text-white mb-3" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                {c.title}
              </h3>
            )}
            {c.subtitle && (
              <p className="text-sm md:text-base leading-relaxed mb-3" style={{ color: "#bbb" }}>
                {c.subtitle}
              </p>
            )}
            {c.body && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#999" }}>
                {c.body}
              </p>
            )}
            {Array.isArray(c.buttons) && c.buttons.length > 0 && (
              <div className="flex gap-3 flex-wrap justify-center lg:justify-start mt-4">
                {c.buttons.map((b, i) => (
                  <a
                    key={i}
                    href={b.url || "#"}
                    target={b.url?.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="inline-block font-black px-7 py-3 rounded-xl text-black text-sm transition duration-300 hover:-translate-y-1"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, boxShadow: "0 4px 30px rgba(201,150,58,0.3)" }}
                  >
                    {b.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
