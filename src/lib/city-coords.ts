// Canonical centroids for the largest Canadian cities. Used as a fallback
// when a listing only has a city/province (no lat/lng) so we can still pin it
// on the map view. Keyed by lowercased "city|province".

export const CITY_COORDS: Record<string, [number, number]> = {
  "toronto|on": [43.6532, -79.3832],
  "mississauga|on": [43.5890, -79.6441],
  "brampton|on": [43.7315, -79.7624],
  "hamilton|on": [43.2557, -79.8711],
  "ottawa|on": [45.4215, -75.6972],
  "london|on": [42.9849, -81.2453],
  "markham|on": [43.8561, -79.3370],
  "vaughan|on": [43.8361, -79.4983],
  "kitchener|on": [43.4516, -80.4925],
  "waterloo|on": [43.4643, -80.5204],
  "windsor|on": [42.3149, -83.0364],
  "oakville|on": [43.4675, -79.6877],
  "burlington|on": [43.3255, -79.7990],
  "barrie|on": [44.3894, -79.6903],
  "guelph|on": [43.5448, -80.2482],
  "kingston|on": [44.2312, -76.4860],
  "richmond hill|on": [43.8828, -79.4403],
  "oshawa|on": [43.8971, -78.8658],
  "ajax|on": [43.8509, -79.0205],
  "pickering|on": [43.8384, -79.0868],
  "whitby|on": [43.8975, -78.9428],
  "cambridge|on": [43.3616, -80.3144],
  "st. catharines|on": [43.1594, -79.2469],
  "niagara falls|on": [43.0896, -79.0849],
  "thunder bay|on": [48.3809, -89.2477],
  "sudbury|on": [46.4917, -80.9930],
  "sault ste. marie|on": [46.5197, -84.3461],

  "montreal|qc": [45.5019, -73.5674],
  "laval|qc": [45.6066, -73.7124],
  "quebec city|qc": [46.8139, -71.2080],
  "quebec|qc": [46.8139, -71.2080],
  "gatineau|qc": [45.4765, -75.7013],
  "longueuil|qc": [45.5371, -73.5114],
  "sherbrooke|qc": [45.4040, -71.8929],
  "trois-rivieres|qc": [46.3432, -72.5432],
  "trois-rivières|qc": [46.3432, -72.5432],
  "saguenay|qc": [48.4280, -71.0683],
  "levis|qc": [46.7382, -71.2465],
  "lévis|qc": [46.7382, -71.2465],

  "vancouver|bc": [49.2827, -123.1207],
  "surrey|bc": [49.1913, -122.8490],
  "burnaby|bc": [49.2488, -122.9805],
  "richmond|bc": [49.1666, -123.1336],
  "abbotsford|bc": [49.0504, -122.3045],
  "coquitlam|bc": [49.2838, -122.7932],
  "kelowna|bc": [49.8880, -119.4960],
  "victoria|bc": [48.4284, -123.3656],
  "nanaimo|bc": [49.1659, -123.9401],
  "kamloops|bc": [50.6745, -120.3273],
  "prince george|bc": [53.9171, -122.7497],
  "langley|bc": [49.1044, -122.6604],

  "calgary|ab": [51.0447, -114.0719],
  "edmonton|ab": [53.5461, -113.4938],
  "red deer|ab": [52.2681, -113.8112],
  "lethbridge|ab": [49.6956, -112.8451],
  "medicine hat|ab": [50.0405, -110.6764],
  "fort mcmurray|ab": [56.7264, -111.3803],
  "st. albert|ab": [53.6303, -113.6258],
  "airdrie|ab": [51.2917, -114.0144],

  "winnipeg|mb": [49.8951, -97.1384],
  "brandon|mb": [49.8483, -99.9501],

  "regina|sk": [50.4452, -104.6189],
  "saskatoon|sk": [52.1332, -106.6700],

  "halifax|ns": [44.6488, -63.5752],
  "sydney|ns": [46.1351, -60.1831],
  "dartmouth|ns": [44.6713, -63.5775],

  "fredericton|nb": [45.9636, -66.6431],
  "moncton|nb": [46.0878, -64.7782],
  "saint john|nb": [45.2733, -66.0633],

  "st. john's|nl": [47.5615, -52.7126],
  "charlottetown|pe": [46.2382, -63.1311],
  "whitehorse|yt": [60.7212, -135.0568],
  "yellowknife|nt": [62.4540, -114.3718],
  "iqaluit|nu": [63.7467, -68.5170],
};

export function lookupCityCoords(city: string | null | undefined, province: string | null | undefined): [number, number] | null {
  if (!city || !province) return null;
  const key = `${city.trim().toLowerCase()}|${province.trim().toLowerCase()}`;
  return CITY_COORDS[key] ?? null;
}
