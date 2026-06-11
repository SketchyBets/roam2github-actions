import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#04080f',
          900: '#070d1a',
          800: '#0a1225',
          700: '#0d1730',
          600: '#111f3d',
          500: '#162549',
        },
        slate: {
          850: '#1a2235',
          750: '#1e2a40',
        },
        accent: {
          blue: '#2563eb',
          cyan: '#06b6d4',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
