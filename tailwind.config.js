/** @type {import('tailwindcss').Config} */

/**
 * Design tokens for the FRAD recruitment platform.
 *
 * The palette is deliberately WARM and LOW-CHROMA: a paper base, a forest-green
 * brand, and a terracotta signal. Tailwind's stock `blue-600`, `emerald-500`,
 * `sky-100` and friends are cool and highly saturated, so they fight this base
 * and are what make an interface read as unconsidered.
 *
 * Semantic colours below are therefore not Tailwind defaults — they are
 * desaturated and warm-shifted so a "success" pill sits in the same light as
 * the paper around it. Roles, not hues: use `success-*`, not `emerald-*`.
 *
 * Neutral policy: `stone` is the only grey ramp. `slate` is cool and must not
 * be used; scripts/audit-design-tokens.mjs enforces both rules.
 */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
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
        },

        /** Terracotta accent. Rules, underlines, the occasional emphasis. */
        signal: {
          50: '#fdf3ef',
          100: '#fae3da',
          200: '#f2c5b3',
          300: '#e5a184',
          400: '#d17f5d',
          500: '#bc6747',
          600: '#a2523a',
          700: '#853f2e',
          800: '#6b3427',
          900: '#582d22',
        },

        /* ---- semantic roles -------------------------------------------- */

        /** Completed, approved, passed, clean. Olive-leaning so it stays
         *  distinguishable from brand chrome without turning mint. */
        success: {
          50: '#eff5ef',
          100: '#dcebdd',
          200: '#bbd7bf',
          300: '#8fbb97',
          400: '#639a70',
          500: '#457c53',
          600: '#356543',
          700: '#2b5237',
          800: '#24422d',
          900: '#1d3525',
        },

        /** Awaiting action, due soon, draft. Ochre rather than school-bus amber. */
        warning: {
          50: '#fdf6e9',
          100: '#f8e9cb',
          200: '#efd497',
          300: '#e0b45e',
          400: '#cd9536',
          500: '#b07b22',
          600: '#92631b',
          700: '#754e18',
          800: '#5f4018',
          900: '#4f3617',
        },

        /** Rejected, failed, blocked, destructive. Brick — a deeper relative of
         *  `signal`, so danger reads as urgent without leaving the palette. */
        danger: {
          50: '#fcf0ec',
          100: '#f8ded4',
          200: '#efbdaa',
          300: '#e29578',
          400: '#d06f4d',
          500: '#b8512f',
          600: '#9c3f24',
          700: '#7f331f',
          800: '#682c1d',
          900: '#57271b',
        },

        /** In progress, informational. Muted slate-blue: the one cool note in
         *  the palette, kept low-chroma so it never shouts. */
        info: {
          50: '#eff3f5',
          100: '#dde6ea',
          200: '#bccdd6',
          300: '#93aebc',
          400: '#6b8da0',
          500: '#4f7186',
          600: '#405c6e',
          700: '#354b5a',
          800: '#2d3e4a',
          900: '#27343e',
        },
      },
      /**
       * A real type scale (1.2 minor third) with line heights and tracking
       * baked in, so headings are consistent without per-page guesswork.
       */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.375rem' }],
        base: ['0.9375rem', { lineHeight: '1.625rem' }],
        lg: ['1.0625rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.022em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.034em' }],
        '5xl': ['3rem', { lineHeight: '1.06', letterSpacing: '-0.038em' }],
        '6xl': ['3.75rem', { lineHeight: '1.02', letterSpacing: '-0.042em' }],
        '7xl': ['4.5rem', { lineHeight: '0.98', letterSpacing: '-0.045em' }],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 20, .04), 0 12px 32px rgba(16, 24, 20, .05)',
        'soft-hover': '0 2px 4px rgba(16, 24, 20, .05), 0 20px 44px rgba(16, 24, 20, .09)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, .7)',
        /** For raised surfaces on the dark workspace band. */
        'on-dark': '0 18px 48px rgba(15, 33, 26, .35)',
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
        },
      },
    },
  },
  plugins: [],
}
