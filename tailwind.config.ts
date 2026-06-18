import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f17",
        surface: "#111827",
        surface2: "#1f2937",
        primary: "#ef4444",
        accent: "#6366f1",
        text: "#f9fafb",
        muted: "#9ca3af",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.35), 0 8px 32px rgba(99,102,241,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
