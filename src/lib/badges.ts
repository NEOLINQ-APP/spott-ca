// Pure, computed-on-read milestone badges — same reasoning as
// profile-strength.ts: never stored, so a badge can't lag behind reality
// or need a backfill job. Every threshold here is a real, objective
// measurement (review count, average rating, tenure) — no curated/manual
// "Elite" status, since that would need real editorial criteria this
// pass doesn't build.
export type MilestoneBadge = { key: string; emoji: string; label: string };

export function getBusinessMilestoneBadges(stats: { reviewCount: number; avgRating: number; createdAt: string }): MilestoneBadge[] {
  const badges: MilestoneBadge[] = [];
  const tenureDays = (Date.now() - new Date(stats.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (stats.reviewCount >= 100 && stats.avgRating >= 4.7) {
    badges.push({ key: "elite", emoji: "👑", label: "Spott Elite" });
  } else if (stats.reviewCount >= 50 && stats.avgRating >= 4.5) {
    badges.push({ key: "favorite", emoji: "🏆", label: "Community Favorite" });
  } else if (stats.reviewCount >= 10 && stats.avgRating >= 4.5) {
    badges.push({ key: "rising", emoji: "⭐", label: "Rising Star" });
  }

  if (tenureDays >= 365 * 5) {
    badges.push({ key: "tenure-5y", emoji: "🎖️", label: "5+ Years on Spott" });
  } else if (tenureDays >= 365) {
    badges.push({ key: "tenure-1y", emoji: "📅", label: "1+ Year on Spott" });
  }

  return badges;
}

export function getUserMilestoneBadges(stats: { reviewCount: number }): MilestoneBadge[] {
  const badges: MilestoneBadge[] = [];
  if (stats.reviewCount >= 50) {
    badges.push({ key: "community-voice", emoji: "🏅", label: "Community Voice" });
  } else if (stats.reviewCount >= 25) {
    badges.push({ key: "top-reviewer", emoji: "🌟", label: "Top Reviewer" });
  } else if (stats.reviewCount >= 5) {
    badges.push({ key: "regular-reviewer", emoji: "📝", label: "Regular Reviewer" });
  } else if (stats.reviewCount >= 1) {
    badges.push({ key: "first-review", emoji: "✍️", label: "First Review" });
  }
  return badges;
}
