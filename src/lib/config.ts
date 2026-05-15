/**
 * Runtime config for the operations console.
 * - Default base URL is "" (same-origin) so all /api/* requests hit the
 *   built-in TanStack Start server routes that proxy/fallback to Azure.
 * - Operators can still override the base URL from Settings.
 */

const STORAGE_KEY = "alazab.api_base_url";
// Old default we want to migrate away from (would cause CORS).
const LEGACY_DEFAULT = "https://azab-rag-func.azurewebsites.net";

const FALLBACK = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return FALLBACK;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored !== LEGACY_DEFAULT) return stored;
  // Migrate: silently drop the legacy direct Azure URL — same-origin proxy
  // handles routing to Azure now.
  if (stored === LEGACY_DEFAULT) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return FALLBACK;
}

export function setApiBaseUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
  else window.localStorage.removeItem(STORAGE_KEY);
}

export const DEFAULT_BRAND =
  (import.meta.env.VITE_DEFAULT_BRAND as string | undefined) ?? "alazab";

export const BRANDS = [
  { id: "alazab", name: "Alazab" },
  { id: "uberfix", name: "UberFix" },
  { id: "luxury_finishing", name: "Luxury Finishing" },
  { id: "brand_identity", name: "Brand Identity" },
  { id: "laban_alasfour", name: "Laban Alasfour" },
] as const;
