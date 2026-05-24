## Scope

Five related upgrades to Spott.ca listings, browse/search, and site footer.

---

### 1. Business hours (collect + display + open/closed)

**Schema (migration):**
- Add `hours jsonb` column to `businesses` (nullable, default `null`).
- Add `price_tier smallint` column to `businesses` (nullable, 1–5, with CHECK 1–5).

**Hours format (stored as JSON):**
```
{
  "mon": { "open": "09:00", "close": "17:00" } | null,  // null = closed
  "tue": {...}, "wed": {...}, "thu": {...}, "fri": {...}, "sat": {...}, "sun": {...},
  "tz": "America/Toronto"
}
```

**Collection UI:**
- `new-listing.tsx`: add an "Hours" section with 7 day rows (open/close time pickers + "closed" toggle). Default timezone derived from province.
- `dashboard.tsx` business editor: same hours editor for existing listings.
- Server fn: extend `createListingWithAI` and add an `updateBusinessHours` server fn.

**Display + Open/Closed:**
- New helper `src/lib/hours.ts`: `isOpenNow(hours)`, `formatHoursLine(hours)`, `nextOpenLabel(hours)`.
- `business.$slug.tsx`: render full weekly schedule + green "Open now" / red "Closed" badge with "Opens at 9:00 AM" subtext.
- Browse card (`browse.tsx`) and `LiveListingsSlider`: show small "Open" / "Closed" pill.

---

### 2. Pagination — 15 per page on Browse + Search

- `browse.tsx`: replace the chunked 5000-row fetch with a paged query. Keep filters server-side, use `.range((page-1)*15, page*15-1)` and a `count: "exact"` for total.
- Add `?page=N` URL param via TanStack search params, syncing with state.
- Build a `Pagination` UI component using existing `src/components/ui/pagination.tsx` (numbered pages with ellipsis, Prev/Next).
- Apply same 15-per-page + pagination to `search.functions.ts` and the search results UI.
- Map view continues to show pins for the **current page only** (matches list).

---

### 3. Click-to-call CTA on every listing card

- On the browse card and any listing card component (`LiveListingsSlider`, dashboard listings, search results): add a button `<a href="tel:+1{phone}">Call</a>` when `phone` exists; otherwise show "Contact" → mailto or detail page.
- Use phone icon from lucide-react. Stop click propagation so the card link still works.
- Mobile-friendly: `tel:` URI triggers native dialer.

---

### 4. Price tier ($–$$$$$)

- Schema covered in #1 (added `price_tier smallint`).
- Owner UI: dropdown/segmented control in `new-listing.tsx` and dashboard editor (1=$, 2=$$, 3=$$$, 4=$$$$, 5=$$$$$).
- Display: render `$` repeated N times next to the category label on cards and detail page.
- Server fns: include `price_tier` in create/update validators (z.number().int().min(1).max(5).optional()).

---

### 5. Footer with About section + legal pages

**New route files:**
- `src/routes/faq.tsx` — collapsible Q&A about Spott.ca, listings, billing, claims, reviews.
- `src/routes/contact.tsx` — contact form (email link + maybe a basic mailto, or a server fn that stores into a `contact_messages` table — will use simple mailto link to keep scope tight; can add table later if user wants).
- `src/routes/terms.tsx` — Terms & Conditions tailored to Spott.ca (Canadian directory, user-generated reviews, Stripe billing).
- `src/routes/privacy.tsx` — Privacy Policy (Lovable Cloud data storage, cookies, analytics, PIPEDA-aware).

**Footer:**
- New `src/components/site-footer.tsx` with an "About" column linking: FAQ, Terms & Conditions, Privacy Policy, Contact Us. Plus existing brand/social columns.
- Mount in `__root.tsx` so it appears site-wide.

Each new route file gets its own SEO `head()` (title, description, canonical, og tags).

---

## Technical notes

- One migration: `hours jsonb`, `price_tier smallint` with CHECK, no RLS changes needed (existing `businesses` policies cover both).
- No new dependencies — `pagination.tsx` shadcn component already exists; `lucide-react` already used; `date-fns` already in tree for tz math (or we'll use a tiny inline helper if not).
- All times stored as `HH:mm` local to the business's `tz`; "Open now" computed client-side using `Intl.DateTimeFormat` for the business timezone.

---

## Out of scope (will not do unless asked)

- Holiday/special hours overrides.
- Multi-shift days (lunch break splits).
- Contact form persistence (using mailto for now).
- Filtering browse by price tier or open-now (display only).
