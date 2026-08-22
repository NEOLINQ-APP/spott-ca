// Pure — computed on demand, never stored, so it can't go stale the way
// a cached percentage column would the moment a business edits anything.
export type ProfileStrengthInput = {
  hero_image_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  hours: unknown;
  category_id: string | null;
  keywords: string[] | null;
  photo_count: number;
};

export type ChecklistItem = { key: string; label: string; done: boolean };

export function getProfileStrength(biz: ProfileStrengthInput): { pct: number; checklist: ChecklistItem[] } {
  const checklist: ChecklistItem[] = [
    { key: "logo", label: "Logo / cover photo", done: !!biz.hero_image_url },
    { key: "description", label: "Description", done: !!biz.description && biz.description.trim().length >= 20 },
    { key: "phone", label: "Phone", done: !!biz.phone },
    { key: "website", label: "Website", done: !!biz.website },
    { key: "hours", label: "Hours", done: !!biz.hours },
    { key: "category", label: "Category", done: !!biz.category_id },
    { key: "photos", label: "Photos", done: biz.photo_count > 0 },
    { key: "keywords", label: "Tags", done: !!biz.keywords && biz.keywords.length > 0 },
  ];
  const done = checklist.filter((c) => c.done).length;
  return { pct: Math.round((done / checklist.length) * 100), checklist };
}
