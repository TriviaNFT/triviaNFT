/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    screens: {
      'sm': '375px',   // Mobile portrait (minimum)
      'md': '768px',   // Tablet portrait
      'lg': '1024px',  // Tablet landscape / Small desktop
      'xl': '1280px',  // Desktop (minimum)
      '2xl': '1536px', // Large desktop
    },
    extend: {
      colors: {
        // Neon-Arcade Theme Colors
        neon: {
          violet: '#8A5CF6',
          'violet-glow': '#A78BFA',
          'violet-dark': '#5B21B6',
          cyan: '#22D3EE',
          lime: '#A3E635',
          amber: '#F59E0B',
        },
        canvas: {
          DEFAULT: '#0B1220',
          elevated: '#121A2A',
          border: '#27324A',
        },
        glass: {
          bg: 'rgba(18, 26, 42, 0.5)',
          'bg-strong': 'rgba(18, 26, 42, 0.8)',
          border: 'rgba(39, 50, 74, 0.3)',
          highlight: 'rgba(255, 255, 255, 0.05)',
        },
        text: {
          high: '#EAF2FF',
          dim: '#9FB0CF',
          primary: '#ffffff',
          secondary: '#a0a0b8',
          tertiary: '#6b6b8a',
        },
        // Existing color scales
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#8b93f8',
          500: '#7c6ff0',
          600: '#6d4ee3',
          700: '#5d3bc8',
          800: '#4d32a3',
          900: '#412d81',
          950: '#1a1a2e',
        },
        secondary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        background: {
          DEFAULT: '#0f0f1e',
          secondary: '#1a1a2e',
          tertiary: '#252541',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(124, 111, 240, 0.3)',
        'glow-lg': '0 0 40px rgba(124, 111, 240, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-delayed': 'float 3s ease-in-out 0.5s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1.0' },
        },
      },
    },
  },
  plugins: [],
};
