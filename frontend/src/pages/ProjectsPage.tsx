import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";

import { api } from "../api";
import { TopBar } from "../components/TopBar";
import type { ProjectView } from "../types";

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "draft":
      return { label: "草稿", cls: "bg-white/10 text-cream/70" };
    case "generating":
      return { label: "生成中", cls: "bg-comet/20 text-comet animate-pulse" };
    case "succeeded":
      return { label: "已完成", cls: "bg-mint/20 text-mint" };
    case "failed":
      return { label: "失败", cls: "bg-candy/20 text-candy" };
    case "interrupted":
      return { label: "已中断", cls: "bg-grape/20 text-grape" };
    default:
      return { label: status, cls: "bg-white/10 text-cream/70" };
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectView | null>(null); // 弹框确认中的项目
  const [busy, setBusy] = useState(false);
  const seq = useRef(0); // 在途防护:删除/刷新后旧列表响应不得覆盖(否则幽灵卡片复活)

  const load = () => {
    const id = ++seq.current;
    api
      .listProjects()
      .then((items) => {
        if (seq.current !== id) return; // 已被更新的请求取代
        setProjects(items);
        setError(null); // 恢复成功后清掉残留的失败横幅
      })
      .catch((e) => {
        if (seq.current !== id) return;
        setError(e instanceof Error ? e.message : "加载失败");
      });
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, []);

  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await api.deleteProject(deleting.id);
      setDeleting(null);
      load(); // 列表刷新,删除项消失
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-comet/70">
                project browser
              </p>
              <h1 className="font-comic text-2xl font-semibold text-cream">项目舱</h1>
            </div>
            <Link to="/" className="btn-candy px-4 py-1.5 text-sm">
              + 新建
            </Link>
          </div>

          {error && (
            <div className="cosmic-card p-4 text-sm text-candy">
              加载失败:{error}
              <button className="btn-ghost-cosmic ml-3 px-3 py-1 text-xs" onClick={load}>
                重试
              </button>
            </div>
          )}

          {projects === null && !error && (
            <div className="cosmic-card p-8 text-center text-sm text-cream/50">加载中…</div>
          )}

          {projects && projects.length === 0 && (
            <div className="cosmic-card flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-cream/70">还没有项目,先去创作台发射一部漫剧吧</p>
              <Link to="/" className="btn-candy">
                ✍️ 去创作
              </Link>
            </div>
          )}

          <div className="space-y-2">
            {projects?.map((p) => {
              const badge = statusBadge(p.status);
              const title = p.content.outline?.title || p.title || `项目 ${p.id}`;
              return (
                <div
                  key={p.id}
                  className="cosmic-card group relative flex items-center gap-3 p-4 pr-14 transition hover:border-star/50"
                >
                  {/* 整卡可点的链接铺在最底层(按钮不再嵌在 <a> 内,嵌套合法) */}
                  <Link
                    to={`/project/${p.id}`}
                    className="absolute inset-0 rounded-blob"
                    aria-label={`打开 ${title}`}
                  />
                  <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-comic text-lg font-semibold text-cream group-hover:text-star">
                          {title}
                        </h2>
                        <span className={clsx("chip", badge.cls)}>{badge.label}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-cream/50">
                        {p.topic} · {p.style}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-cream/40">
                      <div>#{p.id}</div>
                      <div>{fmtDate(p.created_at)}</div>
                    </div>
                  </div>
                  {/* 删除:点击弹确认框;生成中也可删(先自动停止) */}
                  <button
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full px-2 py-1 text-sm text-cream/30 transition hover:bg-candy/15 hover:text-candy"
                    title="删除项目(不可恢复)"
                    aria-label={`删除 ${title}`}
                    onClick={() => setDeleting(p)}
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 删除确认弹框:删除不可恢复,二次确认 */}
      {deleting && (
        <ConfirmDeleteDialog
          title={deleting.content.outline?.title || deleting.title || `项目 ${deleting.id}`}
          running={deleting.status === "generating"}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  title,
  running,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  running: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 删除请求进行中:ESC/外点一律无效,防止"按了取消其实还在删"
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus(); // 焦点进弹窗(不再停留在背后的删除按钮)
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/70 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="删除项目确认"
    >
      <div
        className="cosmic-card-strong w-full max-w-sm p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mt-2 font-comic text-xl font-semibold text-cream">删除项目</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/80">
          确定删除「<span className="font-bold text-candy">{title}</span>」?
        </p>
        {running && (
          <p className="mt-2 rounded-2xl border border-comet/30 bg-comet/10 px-3 py-2 text-xs text-comet">
            该项目正在生成中 —— 删除会先停止生成,再进行清理。
          </p>
        )}
        <p className="mt-2 rounded-2xl border border-candy/30 bg-candy/10 px-3 py-2 text-xs leading-relaxed text-candy">
          ⚠️ 该项目的大纲、角色、分镜、画面、成片与全部消息将一并删除,
          <span className="font-bold">一旦删除无法恢复!</span>
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button ref={cancelRef} className="btn-ghost-cosmic px-5" onClick={onCancel} disabled={busy}>
            再想想
          </button>
          <button
            className="rounded-full border-2 border-candy/60 bg-candy/20 px-5 py-2 font-comic font-semibold text-candy transition hover:bg-candy/30 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "删除中…" : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}
