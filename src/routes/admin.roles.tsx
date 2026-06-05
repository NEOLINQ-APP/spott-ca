import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Shield, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import {
  whoAmI,
  bootstrapFirstAdmin,
  listAdmins,
  grantAdminByEmail,
  revokeAdmin,
} from "@/lib/admin-roles.functions";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRolesPage,
  head: () => ({ meta: [{ title: "Admin · Roles — Spott" }] }),
});

function AdminRolesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const who = useServerFn(whoAmI);
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const list = useServerFn(listAdmins);
  const grant = useServerFn(grantAdminByEmail);
  const revoke = useServerFn(revokeAdmin);

  const [me, setMe] = useState<{ userId: string; email: string | null; isAdmin: boolean; adminCount: number } | null>(
    null,
  );
  const [admins, setAdmins] = useState<Array<{ user_id: string; email: string | null; created_at: string }>>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const w = await who();
      setMe(w);
      if (w.isAdmin) {
        const l = await list();
        setAdmins(l.admins);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [who, list]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const doBootstrap = async () => {
    setBusy("bootstrap");
    try {
      await bootstrap();
      toast.success("You are now an admin");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy("grant");
    try {
      const r = await grant({ data: { email: email.trim() } });
      toast.success(`Granted admin to ${r.email ?? r.user_id}`);
      setEmail("");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doRevoke = async (uid: string) => {
    if (!confirm("Revoke admin role for this user?")) return;
    setBusy(uid);
    try {
      await revoke({ data: { user_id: uid } });
      toast.success("Admin role revoked");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="p-10 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl p-6 md:p-10 space-y-8">
        <header>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Shield className="h-6 w-6" /> Admin roles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-mono">{me?.email ?? me?.userId}</span> ·{" "}
            {me?.isAdmin ? (
              <span className="text-green-600 inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Admin
              </span>
            ) : (
              <span className="text-amber-600">Not an admin</span>
            )}{" "}
            · {me?.adminCount ?? 0} admin{(me?.adminCount ?? 0) === 1 ? "" : "s"} total
          </p>
        </header>

        {!me?.isAdmin && (me?.adminCount ?? 0) === 0 && (
          <section className="rounded-lg border p-5 bg-card">
            <h2 className="font-medium">Claim first admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no admins yet. Claim the role for your account to bootstrap access.
            </p>
            <Button className="mt-3" onClick={doBootstrap} disabled={busy === "bootstrap"}>
              {busy === "bootstrap" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Make me admin
            </Button>
          </section>
        )}

        {!me?.isAdmin && (me?.adminCount ?? 0) > 0 && (
          <section className="rounded-lg border p-5 bg-card">
            <h2 className="font-medium">Access required</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              An admin already exists. Ask an existing admin to grant your account the admin role, then return to this page to verify.
            </p>
            <Link to="/" className="mt-3 inline-block text-sm text-primary underline">Back home</Link>
          </section>
        )}

        {me?.isAdmin && (
          <>
            <section className="rounded-lg border p-5 bg-card">
              <h2 className="font-medium flex items-center gap-2"><UserPlus className="h-4 w-4" /> Grant admin by email</h2>
              <form onSubmit={doGrant} className="mt-3 flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={busy === "grant"}>
                  {busy === "grant" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Grant admin
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                The user must have already signed up. Their email is matched case-insensitively.
              </p>
            </section>

            <section className="rounded-lg border bg-card">
              <div className="p-5 border-b">
                <h2 className="font-medium">Current admins ({admins.length})</h2>
              </div>
              <ul className="divide-y">
                {admins.map((a) => (
                  <li key={a.user_id} className="flex items-center justify-between p-4 gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.email ?? "(no email)"}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{a.user_id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.user_id === me?.userId && (
                        <span className="text-xs rounded bg-muted px-2 py-1">you</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => doRevoke(a.user_id)}
                        disabled={busy === a.user_id || admins.length <= 1}
                        title={admins.length <= 1 ? "Cannot remove the last admin" : "Revoke admin"}
                      >
                        {busy === a.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="text-sm">
              <Link to="/admin/ingest" className="text-primary underline">Go to ingestion admin →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
