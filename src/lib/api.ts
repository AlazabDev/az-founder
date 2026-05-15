/**
 * Thin fetch wrapper around the backend.
 * - Reads base URL from runtime config (Settings page can override it).
 * - Attaches Bearer JWT from localStorage.
 * - Surfaces structured errors so UI can render meaningful messages.
 *
 * No secret material is ever logged or stored client-side.
 */
import { getApiBaseUrl } from "./config";
import { clearSession, getToken } from "./auth";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** When true, body is sent as FormData (file uploads). */
  formData?: FormData;
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body || opts.formData ? "POST" : "GET"),
      headers,
      body,
      signal: opts.signal,
    });
  } catch (e) {
    throw new ApiError(
      "تعذّر الوصول إلى الباك اند. تحقق من الرابط والاتصال بالشبكة.",
      0,
      { cause: (e as Error).message },
    );
  }

  if (res.status === 401) {
    clearSession();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `طلب فاشل (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}
