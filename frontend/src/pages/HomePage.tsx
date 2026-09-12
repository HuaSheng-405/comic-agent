import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";

import { api } from "../api";
import { TopBar } from "../components/TopBar";

const STYLES = [
  { value: "日系动漫", desc: "赛璐珞/清晰线稿" },
  { value: "国风水墨", desc: "水墨晕染/古韵" },
  { value: "赛博朋克", desc: "霓虹/暗色都市" },
  { value: "水彩童话", desc: "暖色手绘/梦幻" },
];

/** 创作台:一句话故事 → 开工 */
export function HomePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState(STYLES[0].value);
  const [customStyle, setCustomStyle] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveStyle = customStyle.trim() || style;

  const create = async () => {
    const text = topic.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const p = await api.createProject(text, effectiveStyle);
      navigate(`/project/${p.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "创建失败");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-6xl gap-6 p-6 lg:grid-cols-[1fr_18rem]">
          {/* 左:故事纸 */}
          <div className="cosmic-card-strong flex min-h-[28rem] flex-col p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-comic text-xl font-semibold text-star">故事创意</h2>
              <span className="text-xs text-cream/40">{topic.length}/2000</span>
            </div>
            <p className="mb-3 text-xs text-cream/50">
              写一句话或一小段:主角、冲突、关键画面、情绪基调。AI 会把它变成一部漫剧。
            </p>
            <textarea
              className="input-cosmic min-h-0 flex-1 resize-none rounded-2xl bg-space-950/60 text-base leading-relaxed"
              placeholder="例如:失意青年每晚搭乘一辆倒行的末班车,回到过去的某个夜晚,却发现每一次倒行都让现实更加破碎。"
              value={topic}
              maxLength={2000}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void create();
              }}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {!customStyle.trim() && (
                  <span className="chip bg-white/10 text-cream/60">{effectiveStyle}</span>
                )}
              </div>
              <button className="btn-candy px-6 py-2.5" onClick={() => void create()} disabled={!topic.trim() || busy}>
                {busy ? "发射中…" : "🛸 生成并进入工作台"}
              </button>
            </div>
          </div>

          {/* 右:风格选择 */}
          <aside className="space-y-4">
            <div className="cosmic-card p-4">
              <h3 className="mb-2 font-comic text-base font-semibold text-cream">视觉风格</h3>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    className={clsx(
                      "rounded-2xl border-2 p-3 text-left transition",
                      !customStyle.trim() && style === s.value
                        ? "border-star/80 bg-star/15"
                        : "border-white/10 bg-white/5 hover:border-white/30",
                    )}
                    onClick={() => {
                      setStyle(s.value);
                      setCustomStyle("");
                    }}
                  >
                    <div className="font-comic text-sm font-semibold text-cream">{s.value}</div>
                    <div className="text-xs text-cream/50">{s.desc}</div>
                  </button>
                ))}
              </div>
              <input
                className="input-cosmic mt-3"
                placeholder="或自定义风格(如: 水墨国风、美式漫画…)"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
              />
            </div>

            <div className="cosmic-card p-4 text-xs leading-relaxed text-cream/60">
              <p className="font-comic text-sm font-semibold text-cream/80">流程</p>
              <p className="mt-1.5">
                大纲 → 角色 → 分镜 → 角色立绘 → 分镜画面 → 成片。每一步产物都会停在「确认门」
                等你验收,随时可以输入修改意见定向返工。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
