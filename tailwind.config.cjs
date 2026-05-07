/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef9ff',
          100: '#dcf2ff',
          200: '#b2e6ff',
          300: '#6ed4ff',
          400: '#33c5ff',
          500: '#0aa3eb',
          600: '#0082ca',
          700: '#0068a3',
          800: '#005887',
          900: '#06496f',
          950: '#042f4a'
        },
        accent: {
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          emerald: '#10b981'
        },
        surface: {
          light: '#f8fafc',
          DEFAULT: '#ffffff',
          dark: '#0b0f19',
          elevated: '#111827'
        },
        gray: {
          850: '#1f2937',
          900: '#111827',
          950: '#0b0f19'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(10, 163, 235, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        soft: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        float: '0 20px 40px -12px rgba(10, 163, 235, 0.25)',
        glow: '0 0 0 1px rgba(10, 163, 235, 0.2), 0 8px 24px rgba(10, 163, 235, 0.15)'
      },
      animation: {
        aurora: 'aurora 20s ease infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite'
      },
      keyframes: {
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(10, 163, 235, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(10, 163, 235, 0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};
