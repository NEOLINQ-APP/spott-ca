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

// BARIO's shared storage box was rebuilt on a new Hetzner account
// 2026-09-07 (see the spott_ca_images_lost_sept7_rebuild memory/incident);
// every file uploaded before that date is permanently gone, confirmed via
// a full DB sweep at fix time (100% of stored photo rows predated it, zero
// exceptions). StoredImage already covers this for real <img> tags via a
// client-side onError fallback, but server-rendered fields read by
// crawlers -- og:image, twitter:image, a page's own JSON-LD `image` --
// can't do that; they need to already be a URL that resolves. This lets a
// caller skip a hero image it knows predates the cutoff (so a real
// pre-existing record's uploaded_at can be checked before using its own
// storage.bario.ca image in metadata) without needing a live existence
// check on every page render.
const STORAGE_REBUILD_CUTOFF = new Date("2026-09-07T00:00:00Z");

export function isStoredUrlLikelyLost(pathOrUrl: string | null | undefined, uploadedAt: string | Date | null | undefined): boolean {
  if (!pathOrUrl) return false;
  if (/^https?:\/\//i.test(pathOrUrl) && !pathOrUrl.includes("storage.bario.ca")) return false; // external URL, unaffected
  if (!uploadedAt) return true; // no timestamp to prove it's safe -- assume lost rather than risk a dead crawler-facing link
  return new Date(uploadedAt) < STORAGE_REBUILD_CUTOFF;
}
