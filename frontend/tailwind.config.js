/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        muted: "#77818d",
        canvas: "#f7f8fa",
        line: "#e8ebef",
        brand: "#476c5b",
        "brand-dark": "#365647",
        "brand-soft": "#edf4ef",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(20, 32, 24, .045)",
      },
    },
  },
  plugins: [],
};
