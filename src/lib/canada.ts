// Canadian provinces + major cities for autocomplete.
export const PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  AB: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Fort McMurray", "Okotoks", "Leduc", "Cochrane", "Camrose"],
  BC: ["Vancouver", "Victoria", "Surrey", "Burnaby", "Richmond", "Kelowna", "Abbotsford", "Coquitlam", "Saanich", "Delta", "Kamloops", "Nanaimo", "Chilliwack", "Prince George", "Langley", "Maple Ridge", "North Vancouver", "West Vancouver", "New Westminster", "Port Coquitlam", "Vernon", "Mission", "Squamish", "Whistler"],
  MB: ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Winkler", "Portage la Prairie", "Selkirk", "Morden", "Dauphin"],
  NB: ["Moncton", "Saint John", "Fredericton", "Dieppe", "Riverview", "Miramichi", "Edmundston", "Bathurst", "Campbellton"],
  NL: ["St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South", "Paradise", "Gander", "Grand Falls-Windsor", "Labrador City"],
  NS: ["Halifax", "Sydney", "Dartmouth", "Truro", "New Glasgow", "Glace Bay", "Kentville", "Yarmouth", "Bridgewater", "Amherst"],
  NT: ["Yellowknife", "Hay River", "Inuvik", "Fort Smith"],
  NU: ["Iqaluit", "Rankin Inlet", "Arviat", "Baker Lake"],
  ON: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor", "Richmond Hill", "Oakville", "Burlington", "Greater Sudbury", "Oshawa", "Barrie", "St. Catharines", "Cambridge", "Kingston", "Whitby", "Guelph", "Ajax", "Thunder Bay", "Waterloo", "Brantford", "Pickering", "Niagara Falls", "Peterborough", "Sault Ste. Marie", "Sarnia", "Welland", "North Bay", "Belleville", "Cornwall", "Chatham-Kent", "Newmarket", "Caledon", "Milton", "Halton Hills", "Aurora", "Stouffville", "Innisfil", "Orangeville", "Bradford", "Orillia", "Stratford", "Timmins", "Owen Sound", "Woodstock", "Quinte West", "Cobourg"],
  PE: ["Charlottetown", "Summerside", "Stratford", "Cornwall", "Montague"],
  QC: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Levis", "Trois-Rivieres", "Terrebonne", "Saint-Jean-sur-Richelieu", "Repentigny", "Brossard", "Drummondville", "Saint-Jerome", "Granby", "Blainville", "Saint-Hyacinthe", "Dollard-des-Ormeaux", "Rimouski", "Chateauguay", "Mascouche", "Boucherville", "Mirabel", "Shawinigan", "Victoriaville", "Sorel-Tracy", "Val-d'Or", "Rouyn-Noranda"],
  SK: ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current", "Yorkton", "North Battleford", "Estevan", "Weyburn", "Lloydminster"],
  YT: ["Whitehorse", "Dawson City", "Watson Lake"],
};

export const ALL_CITIES: { city: string; province: string }[] = Object.entries(CITIES_BY_PROVINCE)
  .flatMap(([prov, list]) => list.map((c) => ({ city: c, province: prov })));

export function searchCities(query: string, limit = 8): { city: string; province: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = ALL_CITIES.filter((c) => c.city.toLowerCase().startsWith(q));
  const contains = ALL_CITIES.filter((c) => !c.city.toLowerCase().startsWith(q) && c.city.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
