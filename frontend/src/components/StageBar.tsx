import { clsx } from "clsx";

import type { ProjectView } from "../types";
import { phaseOfStage, PIPELINE, STAGE_LABEL } from "../types";

interface Props {
  project: ProjectView;
  busy: boolean;
  onGenerate: (startStage?: string) => void;
  onResume: () => void;
  onCancel: () => void;
}

function statusMeta(status: string): { label: string; dot: string } {
  switch (status) {
    case "generating":
      return { label: "生成中", dot: "bg-comet animate-pulse" };
    case "draft":
      return { label: "草稿", dot: "bg-white/30" };
    case "succeeded":
      return { label: "已完成", dot: "bg-mint" };
    case "failed":
      return { label: "失败", dot: "bg-candy" };
    case "interrupted":
      return { label: "已中断", dot: "bg-grape" };
    default:
      return { label: status, dot: "bg-white/30" };
  }
}

/** 阶段轨道 + 进度 + 主操作按钮(卡通化) */
export function StageBar({ project, busy, onGenerate, onResume, onCancel }: Props) {
  const run = project.latest_run;
  const running = run?.status === "running";
  const waitingGate = running ? project.actions.waiting_gate : null;
  // 门禁 = run 已暂停等人裁决(HITL),主徽章优先显示"待确认"而非"生成中",
  // 避免观感混淆:此时底部输入框出现是"允许干预",不是程序仍在执行
  const meta = waitingGate
    ? { label: "待确认", dot: "bg-candy animate-pulse" }
    : statusMeta(project.status);
  const progress = run ? Math.round((run.progress ?? 0) * 100) : 0;
  const currentPhase = phaseOfStage(run?.current_stage ?? null);
  const phaseIndex = currentPhase ? PIPELINE.findIndex((p) => p.key === currentPhase) : -1;
  const generating = project.status === "generating";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 bg-space-900/50 px-3 py-2 backdrop-blur">
      {/* 状态 + 进度 */}
      <div className="flex min-w-0 items-center gap-2" title={project.topic}>
        <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
        <span className="shrink-0 text-xs font-bold text-cream/80">{meta.label}</span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-star via-candy to-comet transition-[width] duration-700"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
        <span className="w-9 text-xs font-bold tabular-nums text-cream/60">{progress}%</span>
        {waitingGate && (
          <span className="chip bg-candy/20 text-candy">
            ✋ 待确认 · {STAGE_LABEL[waitingGate] ?? waitingGate}
          </span>
        )}
      </div>

      {/* 三段轨道 */}
      <nav className="stage-track mx-auto" aria-label="生成阶段">
        {PIPELINE.map((stage, index) => {
          const isCurrent = index === phaseIndex;
          const isPast = phaseIndex >= 0 && index < phaseIndex;
          return (
            <span key={stage.key} className="flex shrink-0 items-center">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-comic font-semibold transition",
                  isCurrent
                    ? "bg-gradient-to-r from-star to-candy text-space-900 shadow-planet"
                    : isPast
                      ? "bg-white/10 text-mint"
                      : "bg-white/5 text-cream/40",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {stage.label}
                {isPast && <span className="text-[10px]">✓</span>}
              </span>
              {index < PIPELINE.length - 1 && (
                <span className={clsx("mx-1 h-px w-4", isPast ? "bg-mint/70" : "bg-white/10")} />
              )}
            </span>
          );
        })}
      </nav>

      {/* 主操作 */}
      <div className="flex shrink-0 items-center gap-2">
        {project.actions.can_resume && (
          <button className="btn-candy px-3 py-1.5 text-sm" onClick={onResume} disabled={busy}>
            ▶️ 恢复续跑
          </button>
        )}
        {project.actions.can_cancel && (
          <button className="btn-ghost-cosmic px-3 py-1.5 text-sm" onClick={onCancel} disabled={busy}>
            ⏹ 停止
          </button>
        )}
        {project.actions.can_generate && !generating && (
          <button
            className="btn-candy px-4 py-1.5 text-sm"
            onClick={() => onGenerate()}
            disabled={busy}
          >
            ✨ {project.status === "draft" ? "开始生成" : "重新生成"}
          </button>
        )}
        {project.actions.can_generate && generating && (
          <button className="btn-candy px-4 py-1.5 text-sm" onClick={() => onGenerate()} disabled={busy}>
            ✨ 重新开始
          </button>
        )}
        {/* 已有成片 + 内容不变 → 只重跑合成段(如改视频参数/镜头数后重合成) */}
        {project.actions.can_generate && project.content.video?.url && (
          <button
            className="btn-ghost-cosmic px-3 py-1.5 text-sm"
            onClick={() => onGenerate("compose")}
            disabled={busy}
            title="复用已批准内容,只重新合成成片"
          >
            🎬 重新合成成片
          </button>
        )}
        {project.actions.can_complete_video && (
          <button
            className="btn-ghost-cosmic px-3 py-1.5 text-sm"
            onClick={() => onGenerate("compose")}
            disabled={busy}
            title="配置完善后补生成之前被跳过的成片"
          >
            🎬 补生成成片
          </button>
        )}
        {project.actions.video_blocker && (
          <span className="hidden text-xs text-cream/50 md:inline" title={project.actions.video_blocker}>
            {project.actions.video_blocker.slice(0, 18)}…
          </span>
        )}
      </div>
    </div>
  );
}
