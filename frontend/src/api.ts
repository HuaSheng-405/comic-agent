import type {
  ConfigResponse,
  ProjectSummary,
  ProjectView,
} from "./types";

export class ApiError extends Error {
  status: number;
  detail: string;
  headers: Record<string, string>;
  constructor(status: number, detail: string, headers: Record<string, string>) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.headers = headers;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data);
    } catch {
      /* 非 JSON 错误体 */
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    throw new ApiError(res.status, detail, headers);
  }
  return (await res.json()) as T;
}

export const api = {
  listProjects: () =>
    request<{ items: ProjectView[] }>("/api/v1/projects").then((d) => d.items),

  createProject: (topic: string, style: string) =>
    request<ProjectSummary>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ topic, style }),
    }),

  getProject: (id: number) => request<ProjectView>(`/api/v1/projects/${id}`),

  generate: (id: number, startStage?: string) =>
    request<{ run_id: number }>(`/api/v1/projects/${id}/generate`, {
      method: "POST",
      body: JSON.stringify(startStage ? { start_stage: startStage } : {}),
    }),

  confirm: (id: number, runId: number, feedback: string) =>
    request<{ run_id: number; ack: boolean }>(`/api/v1/projects/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ run_id: runId, feedback }),
    }),

  resume: (id: number) =>
    request<{ run_id: number; resumed: boolean }>(`/api/v1/projects/${id}/resume`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  cancel: (id: number) =>
    request<{ cancelled: boolean }>(`/api/v1/projects/${id}/cancel`, { method: "POST" }),

  deleteProject: (id: number) =>
    request<{ deleted: boolean; project_id: number }>(`/api/v1/projects/${id}`, {
      method: "DELETE",
    }),

  getConfig: () => request<ConfigResponse>("/api/v1/config"),

  saveConfig: (values: Record<string, string>) =>
    request<ConfigResponse>("/api/v1/config", {
      method: "PUT",
      body: JSON.stringify({ values }),
    }),
};
