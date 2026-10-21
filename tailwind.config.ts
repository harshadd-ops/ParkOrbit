import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sofia-sans)", "Sofia Sans", "Arial", "sans-serif"],
      },
      colors: {
        canvas: "#F3F0EE",
        lifted: "#FCFBFA",
        bone: "#F4F4F4",
        ink: "#141413",
        charcoal: "#262627",
        slate: "#696969",
        granite: "#555555",
        taupe: "#D1CDC7",
        watermark: "#E8E2DA",
        signal: {
          DEFAULT: "#CF4500",
          light: "#F37338",
          clay: "#9A3A0A",
        },
        mc: {
          red: "#EB001B",
          yellow: "#F79E1B",
          blue: "#3860BE",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        pill: "999px",
        stadium: "40px",
        cta: "20px",
        consent: "24px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        nav: "0px 4px 24px 0px rgba(0, 0, 0, 0.04)",
        halo: "0px 24px 48px 0px rgba(0, 0, 0, 0.08)",
        dramatic: "0px 70px 110px 0px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
