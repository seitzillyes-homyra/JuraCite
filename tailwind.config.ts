import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hunter: {
          950: "#060F0A",
          900: "#0C1E14",
          800: "#14301F",
          700: "#1C432B",
          600: "#265639",
          500: "#326C49",
          400: "#4D8A64",
          300: "#74A882",
          200: "#A6CBB3",
          100: "#D3E8DC",
          50: "#EDF5F0",
        },
        parchment: {
          DEFAULT: "#F2EDE0",
          50: "#FDFAF4",
          100: "#F2EDE0",
          200: "#E5DDCC",
          300: "#D4C9B5",
          400: "#BFB09A",
        },
        gold: {
          DEFAULT: "#9E6E1A",
          50: "#FBF3E3",
          100: "#F5E4BA",
          200: "#EAC96C",
          300: "#D4A83C",
          400: "#BC8C26",
          500: "#9E6E1A",
          600: "#7E5614",
          700: "#60410F",
        },
        ink: {
          DEFAULT: "#1A1814",
          900: "#1A1814",
          800: "#2C2820",
          700: "#3E382E",
          600: "#554E44",
          500: "#6E665C",
          400: "#8E8680",
          300: "#AEA8A2",
          200: "#CECCCA",
          100: "#E8E6E4",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest: "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
