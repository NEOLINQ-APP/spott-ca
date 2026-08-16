// Isomorphic (client + server) URL builder for Bario's self-hosted storage
// backend. Split out from barioStorage.server.ts because that file needs
// storage credentials and is server-only in this framework — this one is
// pure string handling and safe to import from client components.
const PUBLIC_BASE = "https://storage.bario.ca/bario-storage";

// Resolves whatever's stored in a *_path/*_url DB column into a real,
// servable URL. Handles three shapes: already-a-full-URL (external stock
// photos, legacy data), a bare key from this backend, and empty/null.
export function resolveStoredUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${PUBLIC_BASE}/${pathOrUrl.replace(/^\/+/, "")}`;
}
