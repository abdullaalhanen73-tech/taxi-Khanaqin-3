/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          bg: '#0D0D0D',
          surface: '#1A1A1A',
          card: '#222222',
          border: '#333333',
        },
        gold: {
          DEFAULT: '#D4A843',
          dark: '#B8882A',
          light: '#F0C060',
        },
        txt: {
          DEFAULT: '#F0F0F0',
          sub: '#AAAAAA',
          muted: '#666666',
        },
        success: '#4CAF50',
        danger: '#E05555',
        mapblue: '#4A9EFF',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
