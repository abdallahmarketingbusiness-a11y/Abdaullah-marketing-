"use client";

import { useEffect, useState } from "react";

/**
 * Dark / Light mode toggle.
 * Persists the choice in localStorage and toggles the `light` class
 * on the <html> element (see /app/globals.css for the token overrides
 * and the inline script in /app/layout.jsx that prevents a flash of
 * the wrong theme on first paint).
 */
export default function ThemeToggle({ className = "" }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch (e) {
      /* ignore storage errors (private mode, etc.) */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "التبديل للوضع الليلي" : "التبديل للوضع النهاري"}
      title={isLight ? "الوضع الليلي" : "الوضع النهاري"}
      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition duration-300 ${className}`}
      style={{
        background: "rgba(201,150,58,0.1)",
        border: "1px solid rgba(201,150,58,0.25)",
        color: "#C9963A",
      }}
    >
      <span
        key={isLight ? "sun" : "moon"}
        style={{ animation: "scaleIn 0.3s ease" }}
        className="text-base leading-none"
      >
        {isLight ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
