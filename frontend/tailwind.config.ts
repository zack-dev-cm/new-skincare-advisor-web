import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Primary scale - purple (from CSS vars) */
        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          glow: 'hsl(var(--primary-glow))',
        },
        /* Semantic - design system */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        tertiary: {
          DEFAULT: 'hsl(var(--tertiary))',
          foreground: 'hsl(var(--tertiary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        /* Fit / status */
        'violet-fit': 'hsl(var(--violet-fit))',
        'emerald-fit': 'hsl(var(--emerald-fit))',
        'lilac-fit': 'hsl(var(--lilac-fit))',
        'gray-fit': 'hsl(var(--gray-fit))',
        /* Neutrals kept for non-semantic use */
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        accentPalette: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        skin: {
          50: '#fefefe',
          100: '#fefefe',
          200: '#fefefe',
          300: '#fefefe',
          400: '#fefefe',
          500: '#fefefe',
          600: '#fefefe',
          700: '#fefefe',
          800: '#fefefe',
          900: '#fefefe',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card': '0 1px 3px 0 hsl(256 87% 55% / 0.1), 0 1px 2px -1px hsl(256 87% 55% / 0.1)',
        'card-hover': '0 10px 25px -3px hsl(256 87% 55% / 0.15), 0 4px 6px -2px hsl(256 87% 55% / 0.1)',
        'bottom-nav': '0 -4px 20px -2px hsl(256 87% 55% / 0.1), 0 -1px 0 0 hsl(0 0% 90% / 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        float: 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease-in-out infinite',
        'brand-pulse': 'brandPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        brandPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.9' },
        },
      },
      backgroundImage: {
        'gradient-clean': 'linear-gradient(135deg, hsl(253 75% 97%) 0%, hsl(253 75% 94%) 50%, hsl(254 73% 78%) 100%)',
        'gradient-subtle': 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(253 75% 97%) 50%, hsl(254 73% 78% / 0.1) 100%)',
        'gradient-minimal': 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(253 75% 97%) 50%, hsl(254 73% 78% / 0.05) 100%)',
        'gradient-accent': 'linear-gradient(135deg, hsl(256 87% 55%) 0%, hsl(254 73% 78%) 50%, hsl(144 100% 80%) 100%)',
        'gradient-splash': 'linear-gradient(135deg, hsl(256 87% 55%) 0%, hsl(254 73% 78%) 50%, hsl(144 100% 80%) 100%)',
        'gradient-affirmation': 'linear-gradient(135deg, hsl(256 87% 55% / 0.12) 0%, hsl(254 73% 78% / 0.08) 100%)',
        'gradient-card-subtle': 'linear-gradient(135deg, hsl(254 73% 78% / 0.03) 0%, hsl(144 100% 80% / 0.02) 100%)',
      },
    },
  },
  plugins: [],
};

export default config; 