//frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf6',
          100: '#d8f3e8',
          200: '#b3e6d3',
          300: '#7fd2b8',
          400: '#47b697',
          500: '#25997b',
          600: '#187b64',
          700: '#156253',
          800: '#144e43',
          900: '#124138',
          950: '#082520',
        },
        ink: {
          DEFAULT: '#0f1f1c',
          muted: '#4b5f5a',
          soft: '#7a8c87',
        },
        gift: {
          50: '#fff8eb',
          100: '#ffecc6',
          400: '#f7b13c',
          500: '#ef9415',
          600: '#d4700e',
        },
        surface: '#f6faf8',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,31,28,0.04), 0 8px 24px -12px rgba(15,31,28,0.12)',
        lift: '0 2px 4px rgba(15,31,28,0.06), 0 20px 40px -20px rgba(21,98,83,0.35)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseDot: { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(1.35)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
