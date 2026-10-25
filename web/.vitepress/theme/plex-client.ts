import { flushLearning } from "./learning-flush";
export interface PlexAccount {
  id: number;
  username: string;
  real_name?: string;
}
export interface TutorContext {
  task_source: string;
  task: { ref: string; version: string; title: string } | null;
  execution_note: string;
}
export interface TutorReply {
  request_id: string;
  session_id: string;
  generation_mode: string;
  status: string;
  summary: string;
  next_step: string;
  follow_up: string;
  evidence_notice?: string;
  annotations?: { line: number; message: string }[];
  pseudocode_lines?: { step: string; explanation: string }[];
}
const accountKey = "plex-account",
  tokenKey = "plex-session";
export function account(): PlexAccount | undefined {
  try {
    return (
      JSON.parse(sessionStorage.getItem(accountKey) || "null") || undefined
    );
  } catch {
    return undefined;
  }
}
function tokens(): { access_token?: string; refresh_token?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(tokenKey) || "{}");
  } catch {
    return {};
  }
}
export class PlexError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
let refreshing: Promise<void> | undefined;
async function request<T>(
  path: string,
  body: unknown,
  method: string,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(90000)])
        : AbortSignal.timeout(90000),
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PlexError(
      "PLEX 服务不可用或请求超时。本机学习可继续，请检查代理与后端后重试。",
    );
  }
  const value = await response.json().catch(() => null);
  if (!response.ok || value?.code !== 0)
    throw new PlexError(
      value?.message ||
        (response.status === 401
          ? "登录已失效，请重新登录。"
          : "PLEX 服务暂不可用，请稍后重试。"),
      response.status,
    );
  return value.data as T;
}
export async function plex<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  signal?: AbortSignal,
): Promise<T> {
  if (!tokens().access_token)
    throw new PlexError("请先在学习起点登录 PLEX 学生账号。", 401);
  try {
    return await request<T>(path, body, method, tokens().access_token, signal);
  } catch (error) {
    if (!(error instanceof PlexError) || error.status !== 401) throw error;
    refreshing ??= request<{ access_token: string }>(
      "/auth/refresh",
      {},
      "POST",
      tokens().refresh_token,
    )
      .then((value) =>
        sessionStorage.setItem(
          tokenKey,
          JSON.stringify({ ...tokens(), ...value }),
        ),
      )
      .finally(() => {
        refreshing = undefined;
      });
    try {
      await refreshing;
    } catch {
      sessionStorage.removeItem(tokenKey);
      window.dispatchEvent(new Event("plex-session-expired"));
      throw new PlexError("登录已失效。本机账号记录仍保留，请重新登录。", 401);
    }
    return request<T>(path, body, method, tokens().access_token, signal);
  }
}
export async function login(username: string, password: string) {
  const value = await request<
    PlexAccount & {
      role: string | { name: string };
      access_token: string;
      refresh_token: string;
    }
  >("/auth/login", { username, password }, "POST");
  if (
    (typeof value.role === "string" ? value.role : value.role?.name) !==
    "student"
  )
    throw new PlexError("本教材使用 PLEX 学生账号。");
  await flushLearning();
  sessionStorage.setItem(
    tokenKey,
    JSON.stringify({
      access_token: value.access_token,
      refresh_token: value.refresh_token,
    }),
  );
  sessionStorage.setItem(
    accountKey,
    JSON.stringify({
      id: value.id,
      username: value.username,
      real_name: value.real_name,
    }),
  );
  location.reload();
}
export async function logout() {
  await flushLearning();
  let notice = "";
  try {
    await plex("/auth/logout", { refresh_token: tokens().refresh_token });
  } catch {
    notice = "本机已退出；服务不可用，服务端会话撤销未确认。";
  }
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(accountKey);
  if (notice) sessionStorage.setItem("plex-auth-notice", notice);
  location.reload();
}
