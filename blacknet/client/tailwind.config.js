/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bn-black': '#0a0a0f',
        'bn-dark': '#111118',
        'bn-card': '#16161f',
        'bn-border': '#252530',
        'bn-surface': '#1c1c28',
        'bn-text': '#c8c8d4',
        'bn-muted': '#6b6b80',
        'bn-accent': '#00e5a0',
        'bn-accent-dim': '#00b87d',
        'bn-cyan': '#00d4ff',
        'bn-cyan-dim': '#009fc0',
        'bn-red': '#ff4757',
        'bn-yellow': '#ffc048',
        'bn-green': '#00e5a0',
        'bn-purple': '#a855f7',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        'sans': ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 229, 160, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 229, 160, 0.1)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-red': '0 0 20px rgba(255, 71, 87, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
