/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Schibsted Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#16202A', soft: '#223040', line: '#2E3F52' },
        steel: { DEFAULT: '#2E6A9E', dark: '#245580', light: '#E6EFF7' },
        brass: { DEFAULT: '#C98A2B', light: '#FBF1DE' },
      },
    },
  },
  plugins: [],
};
