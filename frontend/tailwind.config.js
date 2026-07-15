/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support toggling dark mode if needed, default will be dark
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0B0F19',
          card: '#1E293B',
          accent: '#3B82F6',
          cyan: '#06B6D4',
        },
        risk: {
          low: '#10B981',      // Green
          medium: '#F59E0B',   // Yellow/Orange
          high: '#EF4444',     // Red
          critical: '#8B5CF6', // Purple
        }
      }
    },
  },
  plugins: [],
}
