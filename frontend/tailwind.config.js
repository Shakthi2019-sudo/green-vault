/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#0D5C3A',  // Primary Green Vault Deep Emerald
          800: '#0A462C',
          900: '#062E1D',
          950: '#03170E',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',  // Elegant Muted Gold Accent
          800: '#92400E',
          900: '#78350F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      boxShadow: {
        'vault-sm': '0 1px 2px 0 rgba(13, 92, 58, 0.05)',
        'vault': '0 4px 6px -1px rgba(13, 92, 58, 0.08), 0 2px 4px -2px rgba(13, 92, 58, 0.05)',
        'vault-lg': '0 10px 15px -3px rgba(13, 92, 58, 0.08), 0 4px 6px -4px rgba(13, 92, 58, 0.04)',
      }
    },
  },
  plugins: [],
}
