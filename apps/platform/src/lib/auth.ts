// Auth client for the RunMax API (/auth/register, /auth/login, /auth/me).
// JWT bearer in localStorage; Me shape mirrors apps/api AuthMeSchema.
import { redirect } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

const API_BASE = "http://localhost:8000";
const TOKEN_KEY = "runmax.token";
const ME_KEY = "runmax.me";

export interface Me {
  id: string;
  fullName: string | null;
  email: string | null;
  username: string | null;
  createdAt: string;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function readMe(): Me | null {
  try {
    const raw = localStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

// --- tiny store so the header/drawer re-render on auth changes ---
let me: Me | null = readMe();
const listeners = new Set<() => void>();

function setMe(next: Me | null) {
  me = next;
  if (next) localStorage.setItem(ME_KEY, JSON.stringify(next));
  else localStorage.removeItem(ME_KEY);
  for (const listener of listeners) listener();
}

export function useMe(): Me | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => me,
    () => me,
  );
}

export function isAuthenticated(): boolean {
  return me !== null && getToken() !== null;
}

/** Bearer header for API calls; empty object when signed out. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

// --- API calls ---

async function parseError(res: Response, fallback: string): Promise<AuthError> {
  let message = fallback;
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // non-JSON error body; keep fallback
  }
  return new AuthError(res.status, message);
}

export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<Me> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res, "Register failed");
  const created = (await res.json()) as Me;
  // Auto-login right after register: exchange credentials for a token.
  await login({ email: input.email, password: input.password, skipMeRefresh: true });
  setMe(created);
  return created;
}

export async function login(
  input: { email: string; password: string; skipMeRefresh?: boolean },
): Promise<Me> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  if (res.status === 404) throw new AuthError(404, "Email is not registered");
  if (!res.ok) throw await parseError(res, "Login failed");
  const { token } = (await res.json()) as { token: string };
  localStorage.setItem(TOKEN_KEY, token);
  if (input.skipMeRefresh) return me ?? { id: "", fullName: null, email: input.email, username: null, createdAt: "" };
  return fetchMe();
}

export async function fetchMe(): Promise<Me> {
  const token = getToken();
  if (!token) throw new AuthError(401, "Not signed in");
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    signOut();
    throw new AuthError(401, "Session expired — sign in again");
  }
  if (!res.ok) throw await parseError(res, "Could not load account");
  const loaded = (await res.json()) as Me;
  setMe(loaded);
  return loaded;
}

export function signOut(): void {
  localStorage.removeItem(TOKEN_KEY);
  setMe(null);
}

/** Restore the session on app boot; safe to fire-and-forget. */
export function restoreSession(): void {
  if (getToken() && !me) fetchMe().catch(() => undefined);
}

// --- route guard (ADR 0017) ---

/** True while a fetchMe round-trip for the guard is in flight. */
let restoring: Promise<void> | null = null;

/**
 * Route `beforeLoad` guard: the Board and Plan with AI are account data.
 * No token, or a token the server rejects → /signin. A valid-but-unrestored
 * token is restored once, in flight-shared, before the route renders.
 */
export async function requireAuth(): Promise<void> {
  const token = getToken();
  if (!token) throw redirect({ to: "/signin" });
  if (me) return;
  restoring ??= fetchMe()
    .then(() => undefined)
    .catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      throw redirect({ to: "/signin" });
    })
    .finally(() => {
      restoring = null;
    });
  await restoring;
}
