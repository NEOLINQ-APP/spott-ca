// Client-side compare list (persisted in localStorage). Max 3 vehicles.

const KEY = "spott.vehicle-compare.v1";
const MAX = 3;

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent("spott:compare-change"));
}

export function toggleCompare(id: string): { added: boolean; full: boolean; ids: string[] } {
  const ids = getCompareIds();
  const i = ids.indexOf(id);
  if (i >= 0) {
    ids.splice(i, 1);
    save(ids);
    return { added: false, full: false, ids };
  }
  if (ids.length >= MAX) return { added: false, full: true, ids };
  ids.push(id);
  save(ids);
  return { added: true, full: false, ids };
}

export function removeCompare(id: string) {
  save(getCompareIds().filter((x) => x !== id));
}

export function clearCompare() {
  save([]);
}

export const COMPARE_MAX = MAX;
