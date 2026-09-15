/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Color primario del negocio: #f2b390 (tomado del logo).
        // La escala se construyó sobre su mismo tono (21°) para que todo combine.
        carne: {
          50: '#fef6f1',
          100: '#fdeadf',
          200: '#f9d8c4',
          300: '#f2b390', // ← color de marca
          400: '#e89a6d',
          500: '#db7f4b',
          600: '#c2652f',
          700: '#9e4f24', // acciones y textos de acento (5.8:1 sobre blanco)
          800: '#7a3d1e',
          900: '#5a2d17',
        },
        // Neutros cálidos para superficies: nada de grises fríos junto al durazno.
        crema: {
          50: '#fffcfa',
          100: '#fdf4ee',
          200: '#f7e7dc',
          300: '#efd8c9',
          400: '#dfc0ab',
          500: '#c9a48c',
        },
        // Rojo ladrillo para acciones destructivas: comparte el tono cálido
        // de la marca en vez de chocar con un rojo frío.
        ladrillo: {
          50: '#fdf3f1',
          100: '#fbe3de',
          200: '#f5c8bf',
          500: '#c4452f',
          600: '#ab3624',
          700: '#8f2c1d',
          800: '#73241a',
        },
        // Textos: cafés profundos en lugar de negro puro.
        cacao: {
          400: '#a8846c',
          500: '#8a6750',
          600: '#6d4e3b',
          700: '#543a2b',
          800: '#3c291e',
          900: '#2a1c14', // 9.1:1 sobre el color de marca
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(90,45,23,.08), 0 10px 24px -14px rgba(90,45,23,.35)',
        pop: '0 8px 30px -8px rgba(90,45,23,.30)',
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
