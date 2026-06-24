/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "tn-bg":        "#1a1b26",
        "tn-elev":      "#24283b",
        "tn-border":    "#414868",
        "tn-text":      "#c0caf5",
        "tn-text-mute": "#a9b1d6",
        "tn-text-dim":  "#7a839e",
        "tn-blue":      "#7aa2f7",
        "tn-green":     "#9ece6a",
        "tn-red":       "#f7768e",
        "tn-yellow":    "#e0af68",
        "tn-magenta":   "#bb9af7",
        "tn-cyan":      "#7dcfff",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "monospace",
        ],
      },
      animation: {
        // 530 ms — cadencia clásica xterm (DESIGN.md)
        blink: "blink 530ms step-end infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
