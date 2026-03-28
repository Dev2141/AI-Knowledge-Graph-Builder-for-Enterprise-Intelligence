/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#070d1a",
          800: "#0d1526",
          700: "#111d35",
          600: "#162340",
          500: "#1c2c50",
        },
        accent: {
          blue:   "#3b82f6",
          purple: "#8b5cf6",
          cyan:   "#06b6d4",
          green:  "#10b981",
          amber:  "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":     "fadeIn 0.4s ease-out",
        "slide-up":    "slideUp 0.4s ease-out",
        "glow":        "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" },           to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        glow:    { from: { boxShadow: "0 0 5px #3b82f640" }, to: { boxShadow: "0 0 20px #3b82f680" } },
      },
    },
  },
  plugins: [],
};
