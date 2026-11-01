/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#070C17',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        brand: {
          green: '#22C55E',
          cyan: '#06B6D4',
        },
      },
      borderRadius: {
        card: '26px',
      },
    },
  },
  plugins: [],
};
