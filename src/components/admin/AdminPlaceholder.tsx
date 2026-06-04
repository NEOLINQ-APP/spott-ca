import { Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminPlaceholder({
  title,
  description,
  columns,
  legacyTab,
}: {
  title: string;
  description: string;
  columns: string[];
  legacyTab?: string;
}) {
  return (
    <AdminShell
      title={title}
      description={description}
      actions={
        legacyTab && (
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/legacy">Open in legacy admin</Link>
          </Button>
        )
      }
    >
      <Card>
        <CardContent className="p-10 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Construction className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold">{title} table coming soon</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This page will surface the following columns once wired to the new shell:
          </p>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
            {columns.map((c) => (
              <span key={c} className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs">
                {c}
              </span>
            ))}
          </div>
          {legacyTab && (
            <p className="mt-6 text-xs text-muted-foreground">
              Live data is available in the{" "}
              <Link to="/admin/legacy" className="underline">
                legacy admin
              </Link>{" "}
              under the <span className="font-medium">{legacyTab}</span> tab.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
