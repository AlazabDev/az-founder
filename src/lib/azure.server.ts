/**
 * Server-only Azure helpers.
 *
 * The whole console runs in two modes:
 *   - "not_configured": one or more required Azure secrets are missing.
 *     Endpoints still respond 200 with safe empty/fallback data so the UI
 *     never hangs on "loading…".
 *   - "live": all required secrets present; endpoints proxy to Azure.
 *
 * Keep secrets server-side only. Never echo them in responses.
 */

export type Mode = "live" | "fallback" | "not_configured";

export interface AzureConfig {
  openaiEndpoint?: string;
  openaiKey?: string;
  openaiDeployment?: string;
  searchEndpoint?: string;
  searchKey?: string;
  searchIndex?: string;
  docIntelEndpoint?: string;
  docIntelKey?: string;
  storageConn?: string;
  backendAdminToken?: string;
  jwtSecret?: string;
}

export function readAzureConfig(): AzureConfig {
  return {
    openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    openaiKey: process.env.AZURE_OPENAI_API_KEY,
    openaiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    searchEndpoint: process.env.AZURE_AI_SEARCH_ENDPOINT,
    searchKey: process.env.AZURE_AI_SEARCH_ADMIN_KEY,
    searchIndex: process.env.AZURE_AI_SEARCH_INDEX,
    docIntelEndpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    docIntelKey: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
    storageConn: process.env.AZURE_STORAGE_CONNECTION_STRING,
    backendAdminToken: process.env.BACKEND_ADMIN_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
  };
}

/** True only when every Azure dependency required for live mode is present. */
export function isFullyConfigured(c: AzureConfig = readAzureConfig()): boolean {
  return Boolean(
    c.openaiEndpoint &&
      c.openaiKey &&
      c.openaiDeployment &&
      c.searchEndpoint &&
      c.searchKey &&
      c.searchIndex,
  );
}

export function currentMode(): Mode {
  return isFullyConfigured() ? "live" : "not_configured";
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function jsonOk(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

export function jsonErr(status: number, message: string, extra: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({ status, message, mode: currentMode(), ...extra }),
    { status, headers: { "content-type": "application/json" } },
  );
}

/** Build the integrations status envelope used by /integrations & /tools & /dashboard. */
export function buildIntegrationStatus() {
  const c = readAzureConfig();
  const t = nowIso();
  const item = (
    id: string,
    name: string,
    type: string,
    hasSecret: boolean,
    extraConfigured = true,
  ) => {
    const ok = hasSecret && extraConfigured;
    return {
      id,
      name,
      type,
      status: ok ? "connected" : ("not_configured" as const),
      hasSecret,
      lastCheckedAt: t,
      lastUpdatedAt: null as string | null,
      message: ok ? "تم ضبط السر" : "لم يتم ضبط السر بعد",
    };
  };
  return [
    item("azure_openai", "Azure OpenAI", "azure_openai", !!c.openaiKey, !!c.openaiEndpoint && !!c.openaiDeployment),
    item("azure_search", "Azure AI Search", "azure_search", !!c.searchKey, !!c.searchEndpoint && !!c.searchIndex),
    item("document_intelligence", "Azure Document Intelligence", "document_intelligence", !!c.docIntelKey, !!c.docIntelEndpoint),
    item("azure_storage", "Azure Storage", "azure_storage", !!c.storageConn),
    item("backend", "Backend Admin", "backend", !!c.backendAdminToken),
  ];
}
