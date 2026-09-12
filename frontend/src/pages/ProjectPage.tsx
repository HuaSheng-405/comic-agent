import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import { ChatPanel } from "../components/ChatPanel";
import { StageBar } from "../components/StageBar";
import { StageBoard } from "../components/StageBoard";
import { TopBar } from "../components/TopBar";
import { useProjectPolling } from "../hooks/useProjectPolling";

/** 工作台布局:顶栏/阶段条 / 左侧消息 + 右侧内容舞台 */
export function ProjectPage() {
  const { id } = useParams();
  const projectId = Number(id ?? 0);
  const navigate = useNavigate();
  const { project, error, busy, act } = useProjectPolling(projectId);

  if (projectId <= 0) {
    return (
      <Shell>
        <p className="text-sm text-cream/60">无效的项目 ID</p>
      </Shell>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar projectId={projectId} />
      {project ? (
        <>
          {project.latest_run?.status === "failed" && project.latest_run.error && (
            <div className="border-b-2 border-candy/40 bg-candy/10 px-4 py-2 text-sm text-candy">
              ⚠️ 上次运行失败:{project.latest_run.error}
              {project.latest_run.error.includes("设置") && (
                <span className="text-cream/70"> (去顶栏「⚙️ 设置」完善服务配置后重试)</span>
              )}
            </div>
          )}
          <StageBar
            project={project}
            busy={busy}
            onGenerate={(startStage) =>
              void act(async () => {
                try {
                  await api.generate(projectId, startStage);
                } catch (e) {
                  alert(e instanceof Error ? e.message : "生成失败");
                }
              })
            }
            onResume={() =>
              void act(() =>
                api.resume(projectId).catch((e) => alert(e instanceof Error ? e.message : "恢复失败")),
              )
            }
            onCancel={() =>
              void act(() =>
                api.cancel(projectId).catch((e) => alert(e instanceof Error ? e.message : "取消失败")),
              )
            }
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
            <div className="flex min-h-[16rem] flex-1 flex-col lg:w-1/3 lg:flex-none lg:min-h-0 lg:basis-[21rem]">
              <ChatPanel
                project={project}
                busy={busy}
                onConfirm={(feedback) =>
                  act(async () => {
                    const runId = project.latest_run?.id;
                    if (runId == null) return false;
                    try {
                      await api.confirm(projectId, runId, feedback);
                      return true; // 裁决已被服务端接受 → 前端可禁用本条确认条
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "确认失败");
                      return false;
                    }
                  })
                }
                onCancel={() =>
                  void act(() =>
                    api.cancel(projectId).catch((e) => alert(e instanceof Error ? e.message : "取消失败")),
                  )
                }
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <StageBoard key={project.id} project={project} />
            </div>
          </div>
        </>
      ) : error ? (
        <Shell>
          <div className="space-y-3 text-center">
            <p className="text-sm text-cream/70">无法加载项目: {error}</p>
            <button className="btn-candy" onClick={() => navigate("/projects")}>
              ← 返回项目列表
            </button>
          </div>
        </Shell>
      ) : (
        <Shell>
          <p className="animate-pulse text-sm text-cream/60">加载中…</p>
        </Shell>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </div>
  );
}
