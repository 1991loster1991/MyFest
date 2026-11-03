import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071b35",
        paper: "#f7f4ef",
        gold: "#c69a5b",
        lime: "#c69a5b",
        muted: "#77766f"
      },
      boxShadow: {
        card: "0 12px 40px rgba(20, 20, 20, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
