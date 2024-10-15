import imageRendering from 'tailwindcss-image-rendering'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './admin/index.html',
    './admin/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      sans: ['"Fustat"', 'sans-serif'],
    },
    extend: {},
  },
  plugins: [
    imageRendering(),
  ],
}
