import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b", // Deep gym dark
        surface: "#121215",
        card: {
          DEFAULT: "#18181b",
          border: "#27272a",
        },
        lime: {
          DEFAULT: "#84cc16",
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
          accent: "#ccff00", // High-voltage gym neon lime
        },
      },
      keyframes: {
        pulseMic: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(132, 204, 22, 0.7)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 0 16px rgba(132, 204, 22, 0)" },
        },
      },
      animation: {
        "pulse-mic": "pulseMic 1.8s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
