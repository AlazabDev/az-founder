/**
 * Supabase-backed auth helpers.
 * The browser Supabase client persists the session in localStorage and refreshes tokens automatically.
 * We cache the session synchronously so router guards (`beforeLoad`) can run without awaiting.
 */
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

let cachedSession: Session | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function toSessionUser(user: User | null | undefined): SessionUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      (user.email ? user.email.split("@")[0] : undefined),
    avatarUrl: meta.avatar_url as string | undefined,
  };
}

export function getSession(): Session | null {
  return cachedSession;
}

export function getToken(): string | null {
  return cachedSession?.access_token ?? null;
}

export function getUser(): SessionUser | null {
  return toSessionUser(cachedSession?.user);
}

export function isAuthenticated(): boolean {
  return !!cachedSession;
}

export async function clearSession() {
  await supabase.auth.signOut();
  cachedSession = null;
}

/** Hydrate session from storage on app boot. Safe to call repeatedly. */
export async function hydrateSession(): Promise<void> {
  if (typeof window === "undefined") return;
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = supabase.auth.getSession().then(({ data }) => {
      cachedSession = data.session;
      hydrated = true;
    });
  }
  await hydratePromise;
}

/** Subscribe to auth changes. Call once at app root. */
export function initAuthListener(onChange?: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
    hydrated = true;
    onChange?.(session);
  });
  return () => data.subscription.unsubscribe();
}
