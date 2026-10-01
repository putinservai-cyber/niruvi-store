/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'Fira Code',
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        neutral: {
          400: '#b8b8be', // 7.6:1 contrast on neutral-900 (#171717)
          500: '#9ca3af', // 5.5:1 contrast on neutral-900 (#171717) - WCAG 2.2 AA compliant
          600: '#8a8f9d', // 5.3:1 contrast on #0a0a0c
        },
      },
    },
  },
  plugins: [],
};
