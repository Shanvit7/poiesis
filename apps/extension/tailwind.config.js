/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.tsx",
    "./components/**/*.tsx",
    "./contents/**/*.tsx",
    "./hooks/**/*.ts",
    "./lib/**/*.ts",
    "./services/**/*.ts",
    "./schemas/**/*.ts",
  ],
  theme: {
    extend: {
      // ponytail: matches web app theme from globals.css
      colors: {
        bg: "oklch(0.98 0 0)",
        surface: "oklch(0.94 0.004 262)",
        line: "oklch(0.88 0.003 262)",
        "line-2": "oklch(0.8 0.004 262)",
        fg: "oklch(0.14 0 0)",
        "fg-2": "oklch(0.42 0 0)",
        "fg-3": "oklch(0.6 0 0)",
        primary: "oklch(0.5 0.28 262)",
        "primary-dim": "oklch(0.5 0.28 262 / 0.08)",
        "primary-hover": "oklch(0.43 0.26 262)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
