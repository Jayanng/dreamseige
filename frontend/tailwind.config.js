/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary":         "#7b3fe4",
        "primary-light":   "#C084FC",
        "accent":          "#E4007A",
        "background-dark": "#0A0A0F",
        "surface":         "#0F0F1E",
        "surface-raised":  "#161628",
        "border-muted":    "#2A2A45",
        "border-bright":   "#7b3fe4",
        "accent-teal":     "#00F5D4",
        "accent-pink":     "#F72585",
        "accent-yellow":   "#FFD60A",
        "panel-dark":      "#0D0D1A",
        "nebula-violet":   "#312546",
        "nebula-teal":     "#00f2ff",
        "dot-teal":        "#00E5CC",
        "accent-gold":     "#FFD700",
        "text-primary":    "#F0EEFF",
        "text-secondary":  "#A09DC0",
        "text-muted":      "#5A5880",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "fantasy": ["Cinzel", "serif"],
        "mono":    ["Space Mono", "monospace"]
      },
      animation: {
        'glow-pulse': 'glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: 0.8, filter: 'brightness(1.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      boxShadow: {
        'brand': '0 0 20px rgba(150, 71, 254, 0.3)',
        'brand-lg': '0 0 40px rgba(150, 71, 254, 0.4)',
        'neon': '0 0 15px rgba(0, 209, 255, 0.2)',
      }
    },
  },
  plugins: [],
}
