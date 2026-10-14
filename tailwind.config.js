/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./admin.html", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0070f3",
          dark: "#005ccc",
          light: "#e8f1fd",
        },
        accent: "#00b894",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        scroll: "scroll 25s linear infinite",
        "fade-in-up": "fadeInUp 0.6s ease forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        scroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
