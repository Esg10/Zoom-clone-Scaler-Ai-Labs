import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: "#0B5CFF",
          "blue-hover": "#0A4FDB",
          "blue-light": "#E8EFFF",
          orange: "#FF742E",
          "orange-hover": "#F0631C",
          bg: "#F7F7FA",
          border: "#E4E4ED",
          text: "#131619",
          muted: "#6E7680",
          green: "#16A34A",
          red: "#E02828",
          "red-hover": "#C51F1F",
        },
        room: {
          bg: "#1A1A1A",
          tile: "#242424",
          panel: "#1F1F1F",
          hover: "#333333",
          border: "#383838",
          muted: "#A1A1AA",
          speaker: "#23D959",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
        popover: "0 8px 24px rgba(0, 0, 0, 0.18)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(0) scale(0.8)" },
          "15%": { opacity: "1", transform: "translateY(-10px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-160px) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 180ms ease-out",
        "float-up": "float-up 3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
