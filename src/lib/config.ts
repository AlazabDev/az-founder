/**
 * Runtime config for the operations console.
 * Non-sensitive only. Backend secrets live in Azure Key Vault.
 *
 * The base URL can be overridden at runtime from Settings → Backend URL,
 * which persists in localStorage so operators can re-target without a rebuild.
 */

const STORAGE_KEY = "alazab.api_base_url";
const FALLBACK =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://azab-rag-func.azurewebsites.net";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return FALLBACK;
  return window.localStorage.getItem(STORAGE_KEY) || FALLBACK;
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
