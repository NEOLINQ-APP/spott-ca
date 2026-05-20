// Canadian cities + province aliases for autocomplete.

export const PROVINCES: { code: string; name: string; aliases: string[] }[] = [
  { code: "AB", name: "Alberta", aliases: ["alberta", "ab"] },
  { code: "BC", name: "British Columbia", aliases: ["british columbia", "bc"] },
  { code: "MB", name: "Manitoba", aliases: ["manitoba", "mb"] },
  { code: "NB", name: "New Brunswick", aliases: ["new brunswick", "nb"] },
  { code: "NL", name: "Newfoundland and Labrador", aliases: ["newfoundland", "labrador", "nl", "nfld"] },
  { code: "NS", name: "Nova Scotia", aliases: ["nova scotia", "ns"] },
  { code: "NT", name: "Northwest Territories", aliases: ["northwest territories", "nt"] },
  { code: "NU", name: "Nunavut", aliases: ["nunavut", "nu"] },
  { code: "ON", name: "Ontario", aliases: ["ontario", "on"] },
  { code: "PE", name: "Prince Edward Island", aliases: ["prince edward island", "pei", "pe"] },
  { code: "QC", name: "Quebec", aliases: ["quebec", "qc", "québec"] },
  { code: "SK", name: "Saskatchewan", aliases: ["saskatchewan", "sk"] },
  { code: "YT", name: "Yukon", aliases: ["yukon", "yt"] },
];

export const CITIES: { name: string; province: string; aliases?: string[] }[] = [
  { name: "Toronto", province: "ON", aliases: ["the 6ix", "t.o.", "yyz"] },
  { name: "Mississauga", province: "ON", aliases: ["sauga"] },
  { name: "Brampton", province: "ON" },
  { name: "Hamilton", province: "ON", aliases: ["the hammer"] },
  { name: "Ottawa", province: "ON", aliases: ["yow"] },
  { name: "London", province: "ON" },
  { name: "Markham", province: "ON" },
  { name: "Vaughan", province: "ON" },
  { name: "Kitchener", province: "ON", aliases: ["kw"] },
  { name: "Waterloo", province: "ON", aliases: ["kw"] },
  { name: "Windsor", province: "ON" },
  { name: "Richmond Hill", province: "ON" },
  { name: "Oakville", province: "ON" },
  { name: "Burlington", province: "ON" },
  { name: "Barrie", province: "ON" },
  { name: "Guelph", province: "ON" },
  { name: "Kingston", province: "ON" },
  { name: "Niagara Falls", province: "ON" },
  { name: "St. Catharines", province: "ON", aliases: ["st catharines"] },
  { name: "Montreal", province: "QC", aliases: ["montréal", "mtl", "yul"] },
  { name: "Quebec City", province: "QC", aliases: ["québec", "ville de quebec"] },
  { name: "Laval", province: "QC" },
  { name: "Gatineau", province: "QC" },
  { name: "Longueuil", province: "QC" },
  { name: "Sherbrooke", province: "QC" },
  { name: "Vancouver", province: "BC", aliases: ["van", "yvr"] },
  { name: "Surrey", province: "BC" },
  { name: "Burnaby", province: "BC" },
  { name: "Richmond", province: "BC" },
  { name: "Victoria", province: "BC", aliases: ["yyj"] },
  { name: "Kelowna", province: "BC" },
  { name: "Abbotsford", province: "BC" },
  { name: "Coquitlam", province: "BC" },
  { name: "Langley", province: "BC" },
  { name: "Nanaimo", province: "BC" },
  { name: "Kamloops", province: "BC" },
  { name: "Calgary", province: "AB", aliases: ["yyc", "cowtown"] },
  { name: "Edmonton", province: "AB", aliases: ["yeg"] },
  { name: "Red Deer", province: "AB" },
  { name: "Lethbridge", province: "AB" },
  { name: "Medicine Hat", province: "AB" },
  { name: "Fort McMurray", province: "AB" },
  { name: "Winnipeg", province: "MB", aliases: ["the peg", "ywg"] },
  { name: "Brandon", province: "MB" },
  { name: "Saskatoon", province: "SK", aliases: ["yxe"] },
  { name: "Regina", province: "SK", aliases: ["yqr"] },
  { name: "Halifax", province: "NS", aliases: ["yhz"] },
  { name: "Dartmouth", province: "NS" },
  { name: "Sydney", province: "NS" },
  { name: "Moncton", province: "NB" },
  { name: "Saint John", province: "NB" },
  { name: "Fredericton", province: "NB" },
  { name: "St. John's", province: "NL", aliases: ["st johns"] },
  { name: "Charlottetown", province: "PE" },
  { name: "Whitehorse", province: "YT" },
  { name: "Yellowknife", province: "NT" },
  { name: "Iqaluit", province: "NU" },
];

export type LocationSuggestion = { label: string; value: string; kind: "city" | "province" };

const norm = (s: string) => s.toLowerCase().replace(/\./g, "").trim();

export function suggestLocations(input: string, limit = 8): LocationSuggestion[] {
  const q = norm(input);
  if (!q) return [];
  const out: LocationSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: LocationSuggestion) => {
    if (seen.has(s.value.toLowerCase())) return;
    seen.add(s.value.toLowerCase());
    out.push(s);
  };

  for (const p of PROVINCES) {
    if (norm(p.name).startsWith(q) || p.aliases.some((a) => norm(a).startsWith(q))) {
      push({ label: `${p.name} (${p.code})`, value: p.name, kind: "province" });
    }
  }
  for (const c of CITIES) {
    const matches =
      norm(c.name).startsWith(q) ||
      norm(c.name).includes(q) ||
      (c.aliases?.some((a) => norm(a).startsWith(q) || norm(a).includes(q)) ?? false);
    if (matches) push({ label: `${c.name}, ${c.province}`, value: c.name, kind: "city" });
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
