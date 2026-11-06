import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        arabic: ["var(--font-arabic)", "Arial", "serif"],
        tamil: ["Noto Sans Tamil", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        app: {
          bg: "#F8F6F1",
          surface: "#FFFFFF",
          border: "#E5E0D5",
          hairline: "#ECE7DE",
          muted: "#EFECE7",
          text: "#141716",
          secondary: "#666B67",
          tertiary: "#949995",
          ink: "#071912",
          inkBorder: "#143827",
          sage: "#8DAEA0",
          primary: "#0C4E31",
          primaryHover: "#083823",
          accent: "#0C4E31",
          accentTint: "#EDF7F2",
          accentBorder: "#BDE3D2",
          gold: "#B45309",
          goldTint: "#FFFDF5",
          danger: "#DC2626",
          dangerTint: "#FEF2F2",
          dangerBorder: "#FECACA",
          successTint: "#F0FDF4",
          successBorder: "#BBF7D0",
          hero: "#071912",
          heroBorder: "#143827",
        },
      },
      borderRadius: {
        panel: "16px",
        card: "16px",
        field: "10px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        hero: "0 14px 34px -8px rgba(7, 25, 18, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
