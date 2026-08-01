/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
        cinzel: ["var(--font-cinzel)", "serif"],
      },
      colors: {
        gold: {
          DEFAULT: "#C9963A",
          light: "#E8BE6A",
          lighter: "#F5D78E",
        },
      },
      boxShadow: {
        "gold-sm": "0 2px 20px rgba(201,150,58,0.15)",
        "gold-md": "0 8px 40px rgba(201,150,58,0.18)",
        "gold-lg": "0 20px 60px rgba(201,150,58,0.22)",
        card: "0 10px 30px rgba(0,0,0,0.35)",
        "card-hover": "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,150,58,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(201,150,58,0)" },
          "50%": { boxShadow: "0 0 24px rgba(201,150,58,0.35)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
