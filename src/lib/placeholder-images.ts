// Fallback shown when a listing/business has no real photo (or its real
// photo 404s -- see StoredImage.tsx and the 2026-09-07 storage-rebuild
// incident: every photo uploaded before that date points at a file that no
// longer exists).
//
// Until 2026-09-27 this picked a random *stock photo* from a small curated
// Unsplash pool, hashed per listing id so it stayed consistent. That was a
// real bug, not just a cosmetic one: the pool was picked by category alone
// (sofa/iphone/bike/...), with no relationship to the actual item, so a
// "Buffet table" could show a stock photo of produce, a "Recliner Chair"
// could show sneakers, etc. It looked like a real photo of the wrong item,
// which actively misleads a buyer about what they're looking at -- worse
// than showing no photo at all. Confirmed live on spott.ca's own
// marketplace and on a claimed business's hero image (both cases: this
// exact function was the cause).
//
// Fixed by using one honest, clearly-labeled "no photo provided" graphic
// instead of a substitute photo. It never claims to depict the real item,
// so it can't be a wrong depiction of one. Key kept stable (not the usual
// timestamped upload path) since this is a shared static asset, not
// per-listing user content.
const NO_PHOTO_LISTING = "https://storage.bario.ca/bario-storage/spott/images/campaign-assets/no_photo_listing.png";
const NO_PHOTO_BUSINESS = "https://storage.bario.ca/bario-storage/spott/images/campaign-assets/no_photo_business.png";

// Signatures kept the same as the old hash-based lookup (a key/id argument
// that's now unused) so every existing call site -- MarketplaceCard,
// marketplace.$id.tsx, business.$slug.tsx, MarketplaceRightSidebar --
// needed zero changes.
export function listingPlaceholder(_key: string): string {
  return NO_PHOTO_LISTING;
}

export function businessPlaceholder(_key: string): string {
  return NO_PHOTO_BUSINESS;
}
