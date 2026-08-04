// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        primary: { 500: "#FF6B6B" },
        secondary: { 500: "#4ECDC4" },
        accent: { 400: "#FFE66D" },
        gray: {
          100: "#F3F4F6",
          200: "#E5E7EB",
          500: "#6B7280",
          800: "#1F2937",
        },
        semantic: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      boxShadow: {
        base: "0 2px 20px rgba(0,0,0,0.03)",
        hover: "0 12px 32px rgba(255,107,107,0.15)",
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
      transitionTimingFunction: {
        bento: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
