/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          dark: '#0D0C0A',      // Near-black parchment background
          card: '#1A1814',      // Card/panel surface
          border: '#2E2A22',    // Border
          gold: '#C9A84C',      // Saffron/turmeric aged gold accent
          goldHover: '#E2C06A', // Accent hover
          text: '#F0EAD6',      // Warm off-white primary text
          textMuted: '#8C8070', // Muted secondary text
          error: '#C0392B',
          success: '#27AE60',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
