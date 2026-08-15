import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProfileByUsername } from "@/lib/community.functions";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Mail, Phone, MessageCircle, Crown, Store, User as UserIcon } from "lucide-react";
import { FollowUserButton } from "@/components/FollowUserButton";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const data = await getProfileByUsername({ data: { username: params.username } });
    if (!data.profile) throw notFound();
    return data;
  },
  component: PublicProfilePage,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Profile not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That Spott handle doesn't exist (or was changed).
        </p>
      </main>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </main>
    </div>
  ),
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    const title = p ? `@${p.username} — Spott` : "Spott profile";
    const desc = p?.bio || `${p?.display_name ?? "Member"} on Spott.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(p?.avatar_url ? [{ property: "og:image", content: p.avatar_url }] : []),
      ],
    };
  },
});

function PublicProfilePage() {
  const { profile, roles, counts } = Route.useLoaderData() as any;
  const { user } = useAuth();
  const isMe = user?.id === profile.id;
  const isOwner = roles.includes("owner");
  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div
            className="h-40 w-full bg-gradient-to-br from-primary/30 to-accent/20 sm:h-56"
            style={
              profile.cover_url
                ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
          />
          <div className="relative px-5 pb-5 sm:px-7">
            <div className="-mt-12 flex items-end gap-4 sm:-mt-16">
              <div
                className={`h-24 w-24 overflow-hidden rounded-full border-4 bg-background sm:h-32 sm:w-32 ${
                  isAdmin ? "border-amber-500" : isOwner ? "border-primary" : "border-border"
                }`}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-secondary">
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {isMe ? (
                  <Link
                    to="/dashboard"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/10"
                  >
                    Edit profile
                  </Link>
                ) : (
                  <FollowUserButton targetUserId={profile.id} meId={user?.id ?? null} />
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {profile.display_name || profile.username}
              </h1>
              <span className="text-sm text-muted-foreground">@{profile.username}</span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                  <Crown className="h-3 w-3" /> Admin
                </span>
              ) : isOwner ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Store className="h-3 w-3" /> Business
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Member
                </span>
              )}
            </div>

            {profile.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
              <span>
                <strong className="text-foreground">{counts.followers}</strong> followers
              </span>
              <span>
                <strong className="text-foreground">{counts.following}</strong> following
              </span>
            </div>

            {/* Contact options based on preference */}
            {!isMe && (
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.contact_pref === "chat" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> Prefers Spott Chat (mutual follow required)
                  </span>
                )}
                {profile.contact_pref === "email" && profile.contact_email && (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent/10"
                  >
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
                {profile.contact_pref === "phone" && profile.contact_phone && (
                  <a
                    href={`tel:${profile.contact_phone}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent/10"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
