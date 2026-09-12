import type { Config } from "tailwindcss";

// 「卡通宇宙」主题:深空渐变底 + 星球糖果色 + 圆润卡通字
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#0c0924",
          900: "#151039",
          800: "#211a54",
          700: "#322873",
          600: "#463a94",
        },
        star: "#ffd166", // 星黄(主按钮/高亮)
        comet: "#7fd8f7", // 亮青(链接/进度)
        candy: "#ff9fd8", // 粉(强调/审批)
        mint: "#8df0c4", // 薄荷(成功)
        grape: "#b7a6ff", // 紫罗兰(辅助)
        cream: "#fff6e4", // 奶油(文字/气泡)
      },
      fontFamily: {
        comic: ["Fredoka", "system-ui", "sans-serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: { blob: "1.6rem" },
      boxShadow: {
        "planet": "0 10px 30px -8px rgba(255,209,102,0.25)",
        "cosmic": "0 8px 28px -6px rgba(0,0,0,0.45)",
        "ring": "inset 0 0 0 1px rgba(255,255,255,0.12)",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-6px) rotate(2deg)" },
        },
        twinkle: {
          "0%,100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        comet: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
