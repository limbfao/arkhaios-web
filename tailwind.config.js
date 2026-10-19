/** @type {import('tailwindcss').Config} */

// Arkhaios palette: basalt and stone surfaces, marble text, a bronze accent,
// verdigris for gains and porphyry for losses.
const palette = {
  basalt: "#12110f",   // page background
  stone: "#1a1816",    // panels
  slate: "#24211d",    // raised / hover
  line: "#2f2b26",     // hairlines and borders
  marble: "#ece7df",   // primary text
  muted: "#9c9487",    // secondary text
  bronze: "#c9a36a",   // brand accent
  verdigris: "#4fb59a",// gains
  porphyry: "#e25c5c", // losses
};

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        basalt: palette.basalt,
        stone: palette.stone,
        slate: { ...require("tailwindcss/colors").slate, DEFAULT: palette.slate },
        line: palette.line,
        marble: palette.marble,
        muted: palette.muted,
        bronze: { DEFAULT: palette.bronze, light: "#e3c793", dark: "#8f7146" },
        gain: palette.verdigris,
        loss: palette.porphyry,
      },
      opacity: { 15: "0.15", 35: "0.35", 45: "0.45", 65: "0.65", 85: "0.85" },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        josefin: ["Josefin Sans", "sans-serif"],
      },
      gridTemplateColumns: {
        // Custom two-column layout where the first column is 1/4 and the second is 3/4
        'custom-two-col': '1fr 3fr',
      },
    },
  },
  daisyui: {
    themes: [
      {
        customBlackTheme: {
          "primary": palette.bronze,
          "primary-content": "#1b150b",
          "secondary": palette.marble,
          "secondary-content": palette.basalt,
          "accent": palette.verdigris,
          "accent-content": "#06140f",
          "neutral": palette.slate,
          "neutral-content": palette.marble,
          "base-100": palette.basalt,
          "base-200": palette.stone,
          "base-300": palette.slate,
          "base-content": palette.marble,
          "info": "#7fa7c9",
          "success": palette.verdigris,
          "warning": "#e2b65c",
          "error": palette.porphyry,

          "--rounded-box": "0.875rem", // cards and other large boxes
          "--rounded-btn": "0.5rem", // buttons and similar elements
          "--rounded-badge": "1.9rem", // badges and similar
          "--animation-btn": "0.2s", // duration of animation when you click on button
          "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
          "--btn-focus-scale": "0.97", // scale transform of button when you focus on it
          "--border-btn": "1px", // border width of buttons
          "--tab-border": "1px", // border width of tabs
          "--tab-radius": "0.5rem", // border radius of tabs
        },
      },
    ],
  },
  plugins: [require("daisyui")],
};
