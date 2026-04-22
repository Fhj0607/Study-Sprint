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
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          subtle: "var(--color-subtle)",
          border: "var(--color-border)",
        },

        text: {
          main: "var(--color-text-main)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
        },

        accent: {
          DEFAULT: "var(--color-accent)",
          soft: "var(--color-accent-soft)",
          hover: "var(--color-accent-hover)",
        },

        status: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)",
        },

        subject: {
          blue: {
            bg: "var(--subject-blue-bg)",
            text: "var(--subject-blue-text)",
          },
          emerald: {
            bg: "var(--subject-emerald-bg)",
            text: "var(--subject-emerald-text)",
          },
          amber: {
            bg: "var(--subject-amber-bg)",
            text: "var(--subject-amber-text)",
          },
          violet: {
            bg: "var(--subject-violet-bg)",
            text: "var(--subject-violet-text)",
          },
          cyan: {
            bg: "var(--subject-cyan-bg)",
            text: "var(--subject-cyan-text)",
          },
          rose: {
            bg: "var(--subject-rose-bg)",
            text: "var(--subject-rose-text)",
          },
          slate: {
            bg: "var(--subject-slate-bg)",
            text: "var(--subject-slate-text)",
          },
        },
      },
    },
  },
  plugins: [],
};