import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Settings — Spott Admin" }] }),
});

function AdminSettings() {
  return (
    <AdminShell title="Settings" description="Platform configuration and admin tools.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Grant or revoke admin access for team members.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/roles">Manage admins</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data ingest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Import businesses from external sources and monitor enrichment.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/ingest">Open ingest console</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review inbound leads from vehicle listings.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/leads">View leads</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Full moderation and operations tools while the new shell is built out.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/legacy">Open legacy admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
