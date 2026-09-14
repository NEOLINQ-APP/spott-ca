import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { listCityPages } from "@/lib/city-pages";

const BASE_URL = "https://www.spott.ca";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Real bug found 2026-09-15: every one of the queries below had no
// .range()/.limit(), which silently caps at Supabase PostgREST's default
// max-rows (1000) -- confirmed live, the sitemap had exactly 1001 business
// URLs (1000 + the static /business/new entry) while the real table holds
// 7,710 approved businesses. 87% of real business pages were invisible to
// this sitemap, and therefore under-indexed by Google, with zero error or
// warning anywhere. Paginates in pages of 1000 until a page comes back
// short, so this can't silently truncate again regardless of how large any
// of these tables grow.
async function fetchAllRows<T>(
  // PromiseLike, not Promise -- Supabase's query builder is thenable (has
  // .then()) but isn't a real Promise instance (no .catch/.finally), which
  // the stricter Promise type rejects even though awaiting it works fine.
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/browse", changefreq: "daily", priority: "0.9" },
          { path: "/directory", changefreq: "daily", priority: "0.9" },
          { path: "/cities", changefreq: "weekly", priority: "0.8" },
          { path: "/for-business", changefreq: "weekly", priority: "0.8" },
          { path: "/pricing", changefreq: "weekly", priority: "0.7" },
          { path: "/business/new", changefreq: "monthly", priority: "0.6" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        // Programmatic SEO: one entry per Canadian city.
        for (const c of listCityPages()) {
          entries.push({
            path: `/city/${c.slug}`,
            changefreq: "weekly",
            priority: "0.7",
          });
        }


        try {
          const data = await fetchAllRows<{ slug: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("businesses").select("slug,updated_at").eq("status", "approved").range(from, to)
          );
          for (const b of data) {
            entries.push({
              path: `/business/${b.slug}`,
              lastmod: b.updated_at ? new Date(b.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        } catch (e) {
          console.error("sitemap businesses fetch failed", e);
        }

        // Real gap fixed 2026-09-08: marketplace listings, vehicles, and
        // public profiles were never in the sitemap at all — only
        // businesses were. Same "approved"/"active" live-visibility filter
        // each of those already uses on their own detail routes.
        try {
          const data = await fetchAllRows<{ id: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("marketplace_listings").select("id,updated_at").eq("status", "active").range(from, to)
          );
          for (const l of data) {
            entries.push({
              path: `/marketplace/${l.id}`,
              lastmod: l.updated_at ? new Date(l.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.error("sitemap marketplace_listings fetch failed", e);
        }

        try {
          const data = await fetchAllRows<{ id: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("vehicles").select("id,updated_at").eq("status", "active").range(from, to)
          );
          for (const v of data) {
            entries.push({
              path: `/vehicles/${v.id}`,
              lastmod: v.updated_at ? new Date(v.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch (e) {
          console.error("sitemap vehicles fetch failed", e);
        }

        try {
          const data = await fetchAllRows<{ id: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("events").select("id,updated_at").eq("status", "published").range(from, to)
          );
          for (const ev of data) {
            entries.push({
              path: `/events/${ev.id}`,
              lastmod: ev.updated_at ? new Date(ev.updated_at).toISOString() : undefined,
              changefreq: "daily",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.error("sitemap events fetch failed", e);
        }

        try {
          const data = await fetchAllRows<{ id: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("job_postings").select("id,updated_at").eq("status", "published").range(from, to)
          );
          for (const j of data) {
            entries.push({
              path: `/jobs/${j.id}`,
              lastmod: j.updated_at ? new Date(j.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.error("sitemap job_postings fetch failed", e);
        }

        try {
          const data = await fetchAllRows<{ id: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("properties").select("id,updated_at").eq("status", "published").range(from, to)
          );
          for (const p of data) {
            entries.push({
              path: `/real-estate/${p.id}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch (e) {
          console.error("sitemap properties fetch failed", e);
        }

        try {
          const data = await fetchAllRows<{ username: string; updated_at: string | null }>((from, to) =>
            supabaseAdmin.from("profiles").select("username, updated_at").not("username", "is", null).range(from, to)
          );
          for (const p of data) {
            entries.push({
              path: `/u/${p.username}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.4",
            });
          }
        } catch (e) {
          console.error("sitemap profiles fetch failed", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
