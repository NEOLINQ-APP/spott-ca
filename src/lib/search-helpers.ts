// Synonyms + fuzzy helpers for natural-language search.
// Keys map a user phrase -> normalized tokens we should also try to match.

export const SYNONYMS: Record<string, string[]> = {
  // food
  "chinese": ["chinese", "asian", "takeout", "restaurant", "dim sum", "noodles"],
  "chinese food": ["chinese", "asian", "takeout", "restaurant"],
  "japanese": ["japanese", "sushi", "ramen", "asian", "restaurant"],
  "sushi": ["sushi", "japanese", "restaurant"],
  "indian": ["indian", "curry", "restaurant"],
  "italian": ["italian", "pizza", "pasta", "restaurant"],
  "pizza": ["pizza", "italian", "restaurant"],
  "thai": ["thai", "asian", "restaurant"],
  "vietnamese": ["vietnamese", "pho", "asian"],
  "mexican": ["mexican", "tacos", "burrito", "restaurant"],
  "burger": ["burger", "burgers", "fast food", "restaurant"],
  "coffee": ["coffee", "cafe", "espresso", "tea"],
  "cafe": ["cafe", "coffee", "bakery"],
  "bakery": ["bakery", "bread", "pastry", "cake"],
  "vegan": ["vegan", "vegetarian", "plant based"],
  "halal": ["halal", "middle eastern", "shawarma"],
  "shawarma": ["shawarma", "middle eastern", "halal"],
  "bbq": ["bbq", "barbecue", "smokehouse", "grill"],
  "breakfast": ["breakfast", "brunch", "diner"],

  // automotive
  "mechanic": ["mechanic", "auto repair", "garage", "automotive"],
  "auto repair": ["auto repair", "mechanic", "garage", "automotive"],
  "tire": ["tire", "tires", "tire shop", "automotive"],
  "oil change": ["oil change", "mechanic", "auto repair", "automotive"],
  "car wash": ["car wash", "detailing", "automotive"],
  "body shop": ["body shop", "collision", "auto repair", "automotive"],

  // home services
  "plumber": ["plumber", "plumbing", "home services"],
  "plumbing": ["plumber", "plumbing", "home services"],
  "electrician": ["electrician", "electrical", "home services"],
  "hvac": ["hvac", "furnace", "ac", "heating", "cooling"],
  "cleaner": ["cleaner", "cleaning", "maid", "housekeeping"],
  "landscaper": ["landscaper", "landscaping", "lawn", "gardening"],
  "handyman": ["handyman", "repair", "home services"],
  "roofer": ["roofer", "roofing", "home services"],
  "painter": ["painter", "painting", "home services"],

  // beauty
  "barber": ["barber", "haircut", "salon"],
  "salon": ["salon", "hair", "haircut", "barber"],
  "nails": ["nails", "manicure", "pedicure", "nail salon"],
  "spa": ["spa", "massage", "wellness"],
  "massage": ["massage", "spa", "wellness", "therapy"],
  "tattoo": ["tattoo", "ink", "piercing"],
  "lashes": ["lashes", "eyelash", "beauty"],

  // health
  "dentist": ["dentist", "dental", "orthodontist"],
  "doctor": ["doctor", "physician", "clinic", "medical"],
  "chiropractor": ["chiropractor", "chiro", "wellness"],
  "physio": ["physio", "physiotherapy", "therapy"],
  "gym": ["gym", "fitness", "crossfit", "yoga"],
  "yoga": ["yoga", "fitness", "wellness"],

  // pro
  "lawyer": ["lawyer", "attorney", "legal", "law firm"],
  "accountant": ["accountant", "accounting", "bookkeeping", "tax"],
  "realtor": ["realtor", "real estate", "agent"],
  "photographer": ["photographer", "photography"],

  // retail
  "grocery": ["grocery", "groceries", "supermarket", "market"],
  "florist": ["florist", "flowers", "bouquet"],
  "pet": ["pet", "pets", "vet", "veterinarian"],

  // events
  "dj": ["dj", "music", "entertainment"],
  "wedding": ["wedding", "events", "catering"],
  "catering": ["catering", "events", "food"],
};

// Stopwords stripped from natural-language queries.
const STOP = new Set([
  "i", "need", "want", "the", "a", "an", "closest", "nearest", "near",
  "me", "to", "for", "find", "looking", "look", "any", "some", "best",
  "good", "place", "places", "spot", "spots", "shop", "shops", "store",
  "stores", "open", "now", "today", "in", "on", "of", "and", "or",
  "with", "around", "by", "&",
]);

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Strip stopwords. Keep multi-word synonym phrases intact when present. */
export function tokenize(query: string): string[] {
  const n = normalize(query);
  if (!n) return [];
  // First check multi-word synonym phrases
  const matched: string[] = [];
  let rest = " " + n + " ";
  for (const phrase of Object.keys(SYNONYMS)) {
    if (phrase.includes(" ") && rest.includes(" " + phrase + " ")) {
      matched.push(phrase);
      rest = rest.replace(" " + phrase + " ", " ");
    }
  }
  const words = rest.split(/\s+/).filter((w) => w && !STOP.has(w));
  return [...matched, ...words];
}

/** Expand tokens with synonyms; deduplicates. */
export function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const syns = SYNONYMS[t];
    if (syns) syns.forEach((s) => out.add(s));
  }
  return Array.from(out).filter((s) => s.length >= 2);
}

/** Levenshtein distance with early-out. */
export function lev(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let curr = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      curr.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[n];
}

/** True if any token matches any field token within `max` edits.
 *  Stricter rules to avoid spurious matches like "ice" -> "tire":
 *  - Short tokens (<4 chars) require an EXACT word match.
 *  - includes() only counts when the needle is >=4 chars.
 *  - Fuzzy lev distance only applied to tokens >=5 chars. */
export function fuzzyMatch(haystack: string, needles: string[], max = 1): boolean {
  const hayTokens = normalize(haystack).split(/\s+/).filter(Boolean);
  for (const need of needles) {
    if (need.includes(" ")) {
      if (normalize(haystack).includes(need)) return true;
      continue;
    }
    for (const h of hayTokens) {
      if (!h) continue;
      if (h === need) return true;
      if (need.length >= 4 && (h.includes(need) || need.includes(h))) return true;
      if (need.length >= 5 && h.length >= 5 && lev(h, need, max) <= max) return true;
    }
  }
  return false;
}
