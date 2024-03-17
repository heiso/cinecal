import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    fontFamily: {
      default: ['open-sans', 'sans-serif'],
    },
    extend: {
      fontFamily: {
        AtkinsonHyperlegible: ['Atkinson Hyperlegible', 'Atkinson Hyperlegible Fallback'],
      },
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
} satisfies Config
