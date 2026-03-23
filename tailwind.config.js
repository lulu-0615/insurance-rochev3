/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "deep-navy": "#002347",
        "hero-navy": "#001A33",
        "tech-blue": "#007AFF",
        "mint-breath": "#E0F2F1"
      },
      fontFamily: {
        sans: ["Inter", "Montserrat", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0,0,0,.35)",
        glow: "0 0 0 1px rgba(0,122,255,.25), 0 0 40px rgba(0,122,255,.22)"
      },
      backgroundImage: {
        "card-border":
          "linear-gradient(135deg, rgba(0,122,255,.75), rgba(224,242,241,.35), rgba(0,122,255,.35))"
      }
    }
  },
  plugins: []
};

