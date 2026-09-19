// Board API client: the Week record lives on the agent server for user
// `demo` (ADR 0002/0010). GET/PATCH /api/week read and apply card edits
// (illegal edits rejected server-side by checkWeek); POST /api/build runs
// the real BuildThisWeek workflow.
import type { Week } from "@runmax/domain";

const API_BASE = "http://localhost:8000";

export async function fetchWeek(): Promise<Week | null> {
  const res = await fetch(`${API_BASE}/api/week`);
  if (!res.ok) throw new Error(`GET /api/week failed: ${res.status}`);
  const body = (await res.json()) as { week: Week | null };
  return body.week;
}

export async function patchWeek(week: Week): Promise<{ ok: boolean; violations?: { code: string; detail: string }[] }> {
  const res = await fetch(`${API_BASE}/api/week`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ week }),
  });
  if (res.status === 422) return (await res.json()) as { ok: false; violations: { code: string; detail: string }[] };
  if (!res.ok) throw new Error(`PATCH /api/week failed: ${res.status}`);
  return { ok: true };
}

export interface BuildResponse {
  ok: boolean;
  week?: Week;
  error?: string;
}

export async function buildWeek(log: string): Promise<BuildResponse> {
  const res = await fetch(`${API_BASE}/api/build`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ log }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `Build failed (${res.status})` };
  }
  return (await res.json()) as BuildResponse;
}
