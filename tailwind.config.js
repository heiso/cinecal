/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.tsx'],
  theme: {
    fontFamily: {
      default: ['open-sans', 'sans-serif'],
    },
    extend: {
      colors: {
        transparent: 'transparent',
        black: '#000',
        white: '#fff',
        gray: '#ccc',
        background: '#0D1116',
        primary: '#009DDC',
      },
      aspectRatio: {
        poster: '62/85',
      },
    },
  },
  plugins: [],
}
