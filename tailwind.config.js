/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0a0b',
          900: '#121214',
          850: '#17171a',
          800: '#1f1f23',
          700: '#2c2c32',
          600: '#3d3d45',
        },
        brand: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc171',
          400: '#ff9d38',
          500: '#ff8112',
          600: '#f06507',
          700: '#c74b08',
          800: '#9e3b0f',
          900: '#7f3310',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .22s ease-out both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
}
