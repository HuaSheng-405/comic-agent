import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

import type { ProjectView, Shot, ShotImage } from "../types";
import { isPlaceholder, stageIsApproval } from "../types";

type TabKey = "overview" | "characters" | "shots" | "video";

interface Props {
  project: ProjectView;
}

/** 右侧内容舞台:按产物分区浏览 */
export function StageBoard({ project }: Props) {
  const content = project.content;
  const has = {
    overview: Boolean(content.outline?.title || content.outline?.logline),
    characters: (content.characters?.length ?? 0) > 0,
    shots: (content.shots?.length ?? 0) > 0,
    video: Boolean(content.video?.url),
  };
  const tabs: { key: TabKey; label: string }[] = (
    [
      { key: "overview", label: "大纲" },
      { key: "characters", label: "角色" },
      { key: "shots", label: "分镜" },
      { key: "video", label: "成片" },
    ] as { key: TabKey; label: string }[]
  ).filter((t) => has[t.key]);

  const stage = project.latest_run?.current_stage ?? null;
  const autoTab = useMemo<TabKey | null>(() => {
    if (stageIsApproval(stage) || !stage) return null;
    if (stage.startsWith("plan_outline")) return "overview";
    if (stage.startsWith("plan_character")) return "characters";
    if (stage.startsWith("plan_shots")) return "shots";
    if (stage.startsWith("render_character")) return "characters";
    if (stage.startsWith("render_shots")) return "shots";
    if (stage.startsWith("compose")) return "video";
    return null;
  }, [stage]);

  const [tab, setTab] = useState<TabKey | null>(null);
  // 换项目/内容被清空(整轮重生成)后,手动选的 tab 不再压过内容事实
  useEffect(() => setTab(null), [project.id]);
  const active: TabKey | null =
    (tab && has[tab] ? tab : null) ?? autoTab ?? (tabs[0]?.key ?? null);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-blob border border-white/10 bg-space-900/50 backdrop-blur">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-comic font-semibold transition",
              active === t.key
                ? "bg-white/15 text-cream ring-1 ring-white/25"
                : "text-cream/50 hover:bg-white/5 hover:text-cream",
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        {tabs.length === 0 && <span className="text-xs text-cream/40">内容将随生成进度出现</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {active === "overview" && <OverviewPanel project={project} />}
        {active === "characters" && <CharactersPanel project={project} />}
        {active === "shots" && <ShotsPanel project={project} />}
        {active === "video" && <VideoPanel project={project} />}
      </div>
    </section>
  );
}

function PanelCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="cosmic-card p-4">
      {title && <h3 className="mb-2 font-comic text-base font-semibold text-star">{title}</h3>}
      {children}
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-cream/40">
      <p className="text-sm">{note}</p>
    </div>
  );
}

function OverviewPanel({ project }: Props) {
  const o = project.content.outline;
  if (!o) return <Empty note="大纲生成后会显示在这里" />;
  return (
    <div className="space-y-4">
      <PanelCard>
        <h2 className="font-comic text-2xl font-semibold text-cream">{o.title ?? "未命名"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-cream/80">{o.logline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(o.genre ?? []).map((g) => (
            <span key={g} className="chip bg-comet/20 text-comet">{g}</span>
          ))}
          {(o.themes ?? []).map((t) => (
            <span key={t} className="chip bg-grape/20 text-grape">{t}</span>
          ))}
        </div>
        {o.setting && <Meta label="世界观" value={o.setting} />}
        {o.tone && <Meta label="基调" value={o.tone} />}
        {o.style_note && <Meta label="风格" value={o.style_note} />}
      </PanelCard>
      <PanelCard title="三幕结构">
        <ol className="space-y-2">
          {(o.acts ?? []).map((act, i) => (
            <li key={i} className="rounded-2xl bg-white/5 p-3">
              <div className="font-comic text-sm font-semibold text-comet">{act.title}</div>
              <p className="mt-0.5 text-sm text-cream/80">{act.plot}</p>
            </li>
          ))}
        </ol>
      </PanelCard>
    </div>
  );
}

function CharactersPanel({ project }: Props) {
  const chars = project.content.characters ?? [];
  const images = new Map(
    (project.content.character_images ?? []).map((im) => [im.character_name, im]),
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {chars.map((c, i) => {
        const img = images.get(c.name);
        return (
          <PanelCard key={i}>
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-comic text-lg font-semibold text-cream">{c.name}</h3>
                <p className="mt-0.5 text-xs font-bold text-grape">{c.personality}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-cream/80">{c.appearance}</p>
                {c.quirks && <p className="mt-1 text-xs text-cream/50">{c.quirks}</p>}
              </div>
            </div>
            <div className="mt-3">
              <AssetImage url={img?.url} alt={`${c.name} 立绘`} />
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}

function ShotsPanel({ project }: Props) {
  const shots = project.content.shots ?? [];
  const imgs = new Map<number, ShotImage>(
    (project.content.shot_images ?? []).map((s) => [s.shot_index, s]),
  );
  const chars = project.content.characters ?? [];
  return (
    <div className="space-y-4">
      {shots.map((s) => (
        <ShotCard key={s.index} shot={s} image={imgs.get(s.index)} characters={chars} />
      ))}
    </div>
  );
}

function ShotCard({
  shot,
  image,
  characters,
}: {
  shot: Shot;
  image?: ShotImage;
  characters: { name: string }[];
}) {
  const present = (shot.character_ids ?? [])
    .map((i) => characters[i]?.name)
    .filter(Boolean)
    .join("、");
  return (
    <PanelCard>
      <div className="grid gap-3 md:grid-cols-[minmax(0,14rem)_1fr]">
        <AssetImage url={image?.url} alt={`第 ${shot.index} 镜`} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-comic text-base font-semibold text-star">第 {shot.index} 镜</h3>
            {present && <span className="chip bg-candy/15 text-candy">{present}</span>}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-cream/90">
            <span className="font-bold text-comet">[场景] </span>
            {shot.scene}
          </p>
          <p className="mt-1 text-sm text-cream/80">
            <span className="font-bold text-grape">[镜头] </span>
            {shot.camera}
          </p>
          <p className="mt-1 text-sm text-cream/80">
            <span className="font-bold text-grape">[动作] </span>
            {shot.action}
          </p>
          {shot.dialogue && (
            <p className="mt-1.5 rounded-xl bg-white/5 px-2.5 py-1 text-sm italic text-cream/80">
              {shot.dialogue}
            </p>
          )}
        </div>
      </div>
    </PanelCard>
  );
}

function VideoPanel({ project }: Props) {
  const v = project.content.video;
  if (!v?.url) return <Empty note="成片合成后会显示在这里" />;
  const real = !isPlaceholder(v.url);
  return (
    <div className="space-y-4">
      <PanelCard>
        <h3 className="mb-2 font-comic text-base font-semibold text-star">漫剧成片</h3>
        {real ? (
          <video
            src={v.url}
            controls
            className="mx-auto max-h-[62vh] w-full rounded-2xl bg-black/40"
            playsInline
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-10 text-center">
            <p className="text-sm text-cream/70">占位成片(fake provider,未走真实视频合成)</p>
            <p className="break-all px-4 text-[11px] text-cream/40">{v.url}</p>
          </div>
        )}
        {v.notes && <p className="mt-2 text-xs text-cream/50">{v.notes}</p>}
      </PanelCard>
    </div>
  );
}

function AssetImage({ url, alt }: { url?: string; alt: string }) {
  if (!url || isPlaceholder(url)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5 text-xs text-cream/40">
        等待生成
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="w-full rounded-2xl border border-white/10 object-cover shadow-cosmic"
    />
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="mt-1.5 text-sm text-cream/80">
      <span className="font-bold text-cream/50">{label}: </span>
      {value}
    </p>
  );
}

