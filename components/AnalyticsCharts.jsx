// src/components/AnalyticsCharts.jsx
//
// رسوم بيانية احترافية للتحليلات — SVG خالص من غير أي مكتبة خارجية (خفيف
// وسريع ومتوافق مع Next.js من غير أي إعداد إضافي). بيستخدمها ClientDashboard
// (قسم التحليلات) لعرض الاتجاه الشهري لكل مؤشر.

import { useMemo, useState } from "react";
import { GOLD3 } from "../config/theme";
import { METRIC_DEFS } from "../config/analyticsConfig";

const CHART_W = 640;
const CHART_H = 220;
const PAD_X = 34;
const PAD_TOP = 24;
const PAD_BOTTOM = 34;

export function AnalyticsTrendChart({ trend }) {
  const [metric, setMetric] = useState(METRIC_DEFS[0]);

  const points = useMemo(() => {
    if (!trend || trend.length === 0) return [];
    const values = trend.map((t) => Number(t[metric.key]) || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const usableW = CHART_W - PAD_X * 2;
    const usableH = CHART_H - PAD_TOP - PAD_BOTTOM;
    const step = trend.length > 1 ? usableW / (trend.length - 1) : 0;

    return trend.map((t, i) => {
      const value = Number(t[metric.key]) || 0;
      const x = PAD_X + step * i;
      const y = PAD_TOP + usableH - ((value - min) / range) * usableH;
      return { x, y, value, label: t.label };
    });
  }, [trend, metric]);

  if (!trend || trend.length === 0) return null;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${CHART_H - PAD_BOTTOM} L ${points[0].x.toFixed(1)} ${CHART_H - PAD_BOTTOM} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      {/* أزرار اختيار المؤشر */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {METRIC_DEFS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${metric.key === m.key ? m.color : "rgba(255,255,255,0.12)"}`,
              background: metric.key === m.key ? `${m.color}1f` : "none",
              color: metric.key === m.key ? m.color : "#999",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* الرسم البياني */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height={CHART_H}
          style={{ minWidth: 420, display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="analyticsAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* خطوط شبكة أفقية */}
          {gridLines.map((g) => {
            const y = PAD_TOP + (CHART_H - PAD_TOP - PAD_BOTTOM) * g;
            return (
              <line
                key={g}
                x1={PAD_X}
                x2={CHART_W - PAD_X}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {/* منطقة تحت الخط */}
          {areaPath && <path d={areaPath} fill="url(#analyticsAreaFill)" />}

          {/* خط الاتجاه */}
          <path d={linePath} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* نقاط + تسميات */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="#060606" stroke={metric.color} strokeWidth="2.5" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight="800" fill={GOLD3}>
                {formatValue(p.value, metric.suffix)}
              </text>
              <text x={p.x} y={CHART_H - 10} textAnchor="middle" fontSize="10.5" fill="#888">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function formatValue(value, suffix) {
  if (suffix === "%") return `${value}%`;
  return Number(value).toLocaleString("en-US");
}

// ----------------------------------------------------------------------------
// مقارنة أفضل/أسوأ المنشورات — شريط أفقي بسيط
// ----------------------------------------------------------------------------
export function PostsCompareList({ title, icon, items, tone = "good" }) {
  if (!items || items.length === 0) return null;
  const color = tone === "good" ? "#4ade80" : "#ff8080";

  return (
    <div>
      <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 13.5, marginBottom: 12 }}>
        {icon} {title}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((p, i) => (
          <div
            key={i}
            style={{
              border: "1px solid rgba(201,150,58,0.18)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0 }}>{p.title}</p>
              {p.platform && <p style={{ color: "#888", fontSize: 11, margin: "3px 0 0" }}>{p.platform}</p>}
            </div>
            {p.metric && (
              <span style={{ color, fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap" }}>{p.metric}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// نقاط القوة / الضعف / اقتراحات الشهر القادم — قوائم بطاقات
// ----------------------------------------------------------------------------
export function InsightList({ title, icon, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 style={{ color: GOLD3, fontWeight: 800, fontSize: 13.5, marginBottom: 12 }}>
        {icon} {title}
      </h4>
      <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((text, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              color: "#ddd",
              fontSize: 13,
              lineHeight: 1.7,
              border: "1px solid rgba(201,150,58,0.15)",
              background: "rgba(255,255,255,0.015)",
              borderRadius: 10,
              padding: "9px 12px",
            }}
          >
            <span style={{ color, fontWeight: 900, marginTop: 1 }}>•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
