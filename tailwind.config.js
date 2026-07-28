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
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        '2xl': '0.875rem',
        '3xl': '1rem',
      },
      colors: {
        brand: {
          50: '#f2f7f4',
          100: '#dfece4',
          200: '#bdd9c8',
          300: '#91bea4',
          400: '#619979',
          500: '#427a5d',
          600: '#306249',
          700: '#27513d',
          800: '#214132',
          900: '#1b352a',
          950: '#0f211a',
        },
        navy: {
          800: '#1f2924',
          900: '#131b17',
          950: '#0a100d',
        },
        surface: {
          50: '#fbfaf7',
          100: '#f4f2ec',
          200: '#e5e1d8',
          300: '#d3cdc1',
        }
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(16, 24, 20, .04), 0 12px 32px rgba(16, 24, 20, .05)',
        'soft-hover': '0 2px 4px rgba(16, 24, 20, .05), 0 20px 44px rgba(16, 24, 20, .09)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, .7)',
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
