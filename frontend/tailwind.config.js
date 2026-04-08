/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#12121a',
        'bg-card': '#1a1a2e',
        'bg-card-hover': '#22223a',
        'bg-sidebar': '#0e0e18',
        accent: '#6c5ce7',
        'accent-light': '#a29bfe',
        'text-primary': '#eeeef0',
        'text-secondary': '#9999aa',
        'text-muted': '#66667a',
        'border-col': '#2a2a3e',
        'ev-green': '#00cec9',
        'ev-orange': '#fdcb6e',
        'ev-red': '#ff6b6b',
        'ev-pink': '#fd79a8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
