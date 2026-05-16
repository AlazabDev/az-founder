/**
 * Google Drive helpers (server-only) — call via the Lovable connector gateway.
 * Auth refresh is handled by the gateway. Never call drive.googleapis.com directly.
 */
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

function authHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const drv = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lov) throw new Error("LOVABLE_API_KEY غير مضبوط");
  if (!drv) throw new Error("GOOGLE_DRIVE_API_KEY غير مضبوط — قم بربط Google Drive من الإعدادات");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": drv,
  };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  parents?: string[];
}

export async function listFiles(opts: {
  q?: string;
  pageSize?: number;
  pageToken?: string;
} = {}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    pageSize: String(opts.pageSize ?? 50),
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,parents)",
    orderBy: "modifiedTime desc",
  });
  if (opts.q) params.set("q", opts.q);
  if (opts.pageToken) params.set("pageToken", opts.pageToken);
  const res = await fetch(`${GATEWAY}/files?${params}`, { headers: authHeaders() });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Drive list ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,size,modifiedTime,iconLink,webViewLink,parents",
  });
  const res = await fetch(`${GATEWAY}/files/${fileId}?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Drive meta ${res.status}`);
  return res.json();
}

/** Download bytes of a file. For Google-native docs use exportFile() instead. */
export async function downloadFile(fileId: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await fetch(`${GATEWAY}/files/${fileId}?alt=media`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return { bytes: await res.arrayBuffer(), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

/** Export Google-native files (Docs/Sheets/Slides) as text/plain or pdf. */
export async function exportFile(fileId: string, mimeType = "text/plain"): Promise<string> {
  const params = new URLSearchParams({ mimeType });
  const res = await fetch(`${GATEWAY}/files/${fileId}/export?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Drive export ${res.status}`);
  return res.text();
}

/** Extract best-effort text from a Drive file for LLM processing. */
export async function extractText(file: DriveFile): Promise<string> {
  const m = file.mimeType;
  if (m.startsWith("application/vnd.google-apps.")) {
    if (m.endsWith("document") || m.endsWith("spreadsheet") || m.endsWith("presentation")) {
      return exportFile(file.id, "text/plain");
    }
    return `[ملف Google من نوع ${m} — لا يدعم الاستخراج المباشر]`;
  }
  if (m.startsWith("text/") || m === "application/json" || m === "application/xml") {
    const { bytes } = await downloadFile(file.id);
    return new TextDecoder("utf-8").decode(bytes).slice(0, 200_000);
  }
  // Binary (PDF, images, office): return placeholder — real OCR/parse needs Document Intelligence.
  return `[ملف ثنائي ${file.name} (${m}) — يحتاج Azure Document Intelligence لتحويله إلى نص]`;
}
