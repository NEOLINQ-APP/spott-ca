import { useState } from "react";
import { resolveStoredUrl } from "@/lib/barioStorageUrl";

// Real incident, 2026-09-14: every photo/business image uploaded before
// 2026-09-07 points to a file that no longer exists (BARIO's storage box
// was rebuilt on a new Hetzner account after the old one was cancelled --
// nothing was migrated). Confirmed 100% of stored marketplace/business
// photo rows in the DB predate that cutoff, so this isn't a one-off broken
// link, it's every historical photo on the site. Storage itself is healthy
// again for new uploads (verified live) -- the old files are just gone.
//
// This swaps to a real fallback image the instant the real one 404s
// (onError), instead of a callers only checking "is there a photo on
// record at all" -- that check alone still renders a broken image for
// every row that HAS a storage_path pointing at a now-missing file, which
// was every single one of them.
export function StoredImage({
  path,
  fallbackSrc,
  alt,
  className,
  loading = "lazy",
  onClick,
}: {
  path: string | null | undefined;
  fallbackSrc: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const [broken, setBroken] = useState(false);
  const src = !path || broken ? fallbackSrc : resolveStoredUrl(path);
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onClick={onClick}
      onError={() => {
        if (!broken) setBroken(true);
      }}
    />
  );
}
