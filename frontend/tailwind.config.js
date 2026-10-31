/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182230",
        muted: "#778397",
        canvas: "#f4f6fa",
        line: "#e7eaf1",
        brand: "#6459d6",
        "brand-dark": "#5146bd",
        "brand-soft": "#f0efff",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 5px 20px rgba(28, 38, 64, .045)",
        panel: "0 18px 50px rgba(28, 38, 64, .08)",
      },
    },
  },
  plugins: [],
};
