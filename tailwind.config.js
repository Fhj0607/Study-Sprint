/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './constants/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F7F5EF',
          surface: '#FFFFFF',
          subtle: '#EFEBE3',
          border: '#DDD6C8',
        },

        text: {
          main: '#1F2933',
          secondary: '#52616B',
          muted: '#9AA6B2',
          inverse: '#FFFFFF',
        },

        accent: {
          DEFAULT: '#3B82A0',
          soft: '#DCEFF5',
          hover: '#2F6F88',
          disabled: '#9CC7D6',
        },

        status: {
          success: '#15803D',
          warning: '#B7791F',
          danger: '#B91C1C',
        },

        subject: {
          blue: {
            bg: '#DCEFF5',
            text: '#2F6F88',
          },
          emerald: {
            bg: '#DDEFE5',
            text: '#2F7D55',
          },
          amber: {
            bg: '#F6E8C6',
            text: '#9A6A16',
          },
          violet: {
            bg: '#E9E2F5',
            text: '#6D4BA3',
          },
          cyan: {
            bg: '#DDF0EF',
            text: '#287C7A',
          },
          rose: {
            bg: '#F4E1DF',
            text: '#9B4A43',
          },
          slate: {
            bg: '#E8E4DA',
            text: '#52616B',
          },
        },
      },
    },
  },
  plugins: [],
};