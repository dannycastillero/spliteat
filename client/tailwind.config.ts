import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF5F5F',
        'primary-dark': '#B3272E',
        secondary: '#2EE59D',
        tertiary: '#47D1FF',
        surface: '#F8F9FA',
        'on-surface': '#191C1D',
        'on-surface-variant': '#59413F',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
