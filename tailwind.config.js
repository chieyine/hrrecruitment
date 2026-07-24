/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-playfair)'],
      },
      borderRadius: {
        '2xl': '0.75rem',
        '3xl': '0.875rem',
      },
      colors: {
        brand: {
          50: '#f6f7f6',
          100: '#e8ebea',
          200: '#d1d8d5',
          300: '#b0beba',
          400: '#8ca19b',
          500: '#6f8680',
          600: '#586b66',
          700: '#485753', // Deep forest green / slate green
          800: '#3c4845',
          900: '#343e3c',
          950: '#1e2523',
        },
        navy: {
          800: '#1c1917', // warm charcoal (stone-900)
          900: '#0c0a09', // stone-950
          950: '#000000',
        },
        surface: {
          50: '#fafaf8', // warm off-white linen
          100: '#f4f3ed',
          200: '#e5e3d8',
        }
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.04)',
        'soft-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
    },
  },
  plugins: [],
}
