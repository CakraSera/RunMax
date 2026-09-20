// Board API client: each runner's Week record lives on the server under
// their account (ADR 0002/0010, amended by 0017). GET/PATCH /api/week read
// and apply card edits (illegal edits rejected server-side by checkWeek);
// POST /api/build runs the real BuildThisWeek workflow. All calls carry the
// bearer token — the routes answer 401 without it.
import { authHeaders } from "@/lib/auth";
import type { Week } from "@runmax/domain";

const API_BASE = "http://localhost:8000";

export async function fetchWeek(): Promise<Week | null> {
  const res = await fetch(`${API_BASE}/api/week`, { headers: authHeaders() });
  if (res.status === 401) throw new Error("GET /api/week unauthorized: sign in again");
  if (!res.ok) throw new Error(`GET /api/week failed: ${res.status}`);
  const body = (await res.json()) as { week: Week | null };
  return body.week;
}

export async function patchWeek(week: Week): Promise<{ ok: boolean; violations?: { code: string; detail: string }[] }> {
  const res = await fetch(`${API_BASE}/api/week`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders() },
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
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ log }),
  });
  if (res.status === 401) return { ok: false, error: "Your session ended — sign in again." };
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `Build failed (${res.status})` };
  }
  return (await res.json()) as BuildResponse;
}
