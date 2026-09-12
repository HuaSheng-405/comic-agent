import { useEffect, useRef, useState } from "react";

import type { ProjectView } from "../types";
import { STAGE_LABEL } from "../types";

const AGENT_ICON: Record<string, string> = {
  user: "🧑‍🎨",
  plan_outline: "📜",
  plan_characters: "🧑‍🚀",
  plan_shots: "🎞️",
  render_characters: "🖼️",
  render_shots: "🖌️",
  compose: "🎬",
  review: "🔁",
  outline_approval: "✋",
};

interface Props {
  project: ProjectView;
  busy: boolean;
  onConfirm: (feedback: string) => Promise<boolean>;
  onCancel: () => void;
}

/** 左侧消息流 + 审批条

输入框只在等待确认时出现:同一输入框写修改意见(回车/提交修改),无意见点「通过」。
非等待状态不显示输入框 —— 没有独立反馈通道,门禁外发消息无意义。

防重复裁决(与后端 gateway 状态机配套):裁决成功后被批准的那条门提示消息
(id) 记下来,在下一个门提示消息出现前禁用本确认条 —— 门与门之间
(current_stage 仍停留在旧门名)的第二次点击被 UI 拦掉,而不是等后端 409。
*/
/** 已裁决标记:run 离开被确认的门后,再停到同一道门 = 新的停留(须重新可确认) */
interface AckedGate {
  runId: number;
  stage: string;
  departed: boolean;
}

export function ChatPanel({ project, busy, onConfirm, onCancel }: Props) {
  const [input, setInput] = useState("");
  const [acked, setAcked] = useState<AckedGate | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gate = project.actions.waiting_gate;
  const runId = project.latest_run?.id ?? 0;
  const awaiting = Boolean(gate) && !busy;

  // 换项目时清掉上个项目的已裁决标记
  useEffect(() => setAcked(null), [project.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [project.messages.length, project.actions.waiting_gate]);

  // 观察到 run 离开了被确认的门(waiting_gate 消失/换成别的门)→ departed。
  // 之后同一门再次出现 = 新一轮停留(如回炉重停),确认条必须重新可用;
  // 没离开前(stage 滞留在旧门名)保持禁用,防"第二次点击被下一道门吞掉"。
  useEffect(() => {
    if (!acked) return;
    if (acked.runId !== runId || project.actions.waiting_gate !== acked.stage) {
      setAcked((a) => (a && a.runId === runId ? { ...a, departed: true } : a));
    }
  }, [project.actions.waiting_gate, runId, acked?.runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const justAcked =
    awaiting && acked !== null && !acked.departed && gate === acked.stage && acked.runId === runId;

  const approve = async (feedback: string) => {
    setInput("");
    const ok = await onConfirm(feedback);
    if (ok && gate && runId) setAcked({ runId, stage: gate, departed: false });
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-blob border border-white/10 bg-space-900/50 backdrop-blur">
      {/* 头部:当前阶段说明 */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg" aria-hidden>
            {AGENT_ICON[project.latest_run?.current_stage ?? ""] ?? "🛰️"}
          </span>
          <span className="truncate font-comic text-sm font-semibold text-cream">
            {STAGE_LABEL[project.latest_run?.current_stage ?? ""] ?? "创作对话"}
          </span>
        </div>
        {project.actions.can_cancel && (
          <button
            className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-cream/80 hover:bg-white/10"
            onClick={onCancel}
            disabled={busy}
          >
            ⏹ 停止
          </button>
        )}
      </div>

      {/* 消息流 */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {project.messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-xs text-cream/50">
              {project.status === "draft"
                ? "点上方「开始生成」出发吧"
                : "还没有消息"}
            </p>
          </div>
        )}
        {project.messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "speech-bubble-user" : "speech-bubble"}>
            {msg.agent !== "user" && (
              <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cream/40">
                <span aria-hidden>{AGENT_ICON[msg.agent] ?? "🛰️"}</span>
                {agentLabel(msg.agent)}
              </div>
            )}
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
          </div>
        ))}
      </div>

      {/* 审批条(等待人工确认时出现):单输入框写意见,通过/提交二选一 */}
      {awaiting && (
        <div className="space-y-2 border-t-2 border-candy/40 bg-candy/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-candy">
              ✋ {STAGE_LABEL[gate!] ?? gate} 已完成 — 确认继续?
            </span>
            <button
              className="btn-candy px-4 py-1 text-sm"
              onClick={() => void approve("")}
              disabled={busy || justAcked}
            >
              ✓ 通过
            </button>
          </div>
          <div className="flex items-end gap-2">
            {justAcked ? (
              <span className="text-xs text-mint">已提交裁决,等待执行…(下一轮确认会自动重新开启)</span>
            ) : (
              <>
                <input
                  className="input-cosmic"
                  placeholder="修改意见(可选),回车提交…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // isComposing:中文输入法选词上屏的 Enter 不是"提交"
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) void approve(input);
                  }}
                />
                <button
                  className="btn-ghost-cosmic shrink-0 px-3.5 py-2 text-sm"
                  onClick={() => void approve(input)}
                  disabled={!input.trim() || busy}
                >
                  📨 提交修改
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function agentLabel(agent: string): string {
  if (agent === "user") return "我";
  return STAGE_LABEL[agent] ?? agent;
}
