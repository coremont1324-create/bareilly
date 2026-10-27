/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#06172e', 900: '#0a2342', 800: '#112f57', 700: '#1a3f6f', 600: '#24508a' },
        ocean: { 900: '#0a3640', 800: '#0e4a55', 700: '#13606c', 600: '#1a7a86' },
        brand: { DEFAULT: '#173f86', hover: '#11336f', soft: '#e8effb' },
        surface: { DEFAULT: '#f2f6fb', card: '#ffffff', line: '#dce5f0', muted: '#eef3f9' },
        ink: { DEFAULT: '#14233b', soft: '#3d4e66', muted: '#5f6f86' },
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'system-ui', '-apple-system', '"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 37, 66, 0.06), 0 4px 14px rgba(16, 37, 66, 0.05)',
        lift: '0 6px 22px rgba(16, 37, 66, 0.12)',
      },
      borderRadius: { xl: '0.85rem', '2xl': '1.1rem' },
      maxWidth: { page: '78rem' },
    },
  },
  plugins: [],
};
