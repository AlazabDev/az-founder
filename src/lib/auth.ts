/**
 * Lightweight JWT auth against the backend.
 * Token stored in localStorage. Sent as `Authorization: Bearer ...` by the API client.
 * No secrets are stored in the browser besides this short-lived session token.
 */

const TOKEN_KEY = "alazab.jwt";
const USER_KEY = "alazab.user";

export interface SessionUser {
  email: string;
  name?: string;
  role?: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setUser(user: SessionUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
