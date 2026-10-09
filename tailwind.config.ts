import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        navy: {
          50: "#f4f6fb",
          100: "#e9edf7",
          200: "#d3dbee",
          300: "#aebce0",
          400: "#8298cc",
          500: "#5f79bb",
          600: "#4a60a6",
          700: "#3d4d87",
          800: "#354170",
          900: "#1e2645",
          950: "#11162b",
        },
        income: {
          DEFAULT: "#16a34a",
          light: "#dcfce7",
        },
        expense: {
          DEFAULT: "#dc2626",
          light: "#fee2e2",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;