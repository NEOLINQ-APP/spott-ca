// Levenshtein distance for "Did you mean?" suggestions.
export function levenshtein(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export function bestSuggestion(query: string, candidates: string[], maxDist = 3): string | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;
  let best: { word: string; d: number } | null = null;
  for (const raw of candidates) {
    const w = raw.toLowerCase();
    if (w === q) return null; // exact already
    const d = levenshtein(q, w);
    const limit = Math.min(maxDist, Math.max(1, Math.floor(q.length / 3)));
    if (d <= limit && (!best || d < best.d)) best = { word: raw, d };
  }
  return best?.word ?? null;
}
