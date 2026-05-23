import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function countAdmins(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

// Returns whether current caller is admin + total admin count (for bootstrap UI)
export const whoAmI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [admin, total] = await Promise.all([isAdmin(userId), countAdmins()]);
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    return {
      userId,
      email: user?.user?.email ?? null,
      isAdmin: admin,
      adminCount: total,
    };
  });

// First-admin bootstrap: only allowed if there are zero admins in the system.
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const total = await countAdmins();
    if (total > 0) throw new Error("An admin already exists. Ask an existing admin to grant you the role.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// List all admins (admin only)
export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    const out: Array<{ user_id: string; email: string | null; created_at: string }> = [];
    for (const r of roles ?? []) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      out.push({ user_id: r.user_id, email: data?.user?.email ?? null, created_at: r.created_at });
    }
    return { admins: out };
  });

// Grant admin role by email (admin only)
export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    // Find target user by paging through auth users (small project; fine for now)
    const email = data.email.toLowerCase();
    let target: { id: string; email: string | null } | null = null;
    for (let page = 1; page <= 20 && !target; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === email);
      if (u) target = { id: u.id, email: u.email ?? null };
      if (list.users.length < 200) break;
    }
    if (!target) throw new Error(`No user found with email ${data.email}`);
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (insErr) throw new Error(insErr.message);
    return { ok: true, user_id: target.id, email: target.email };
  });

// Revoke admin role (admin only). Cannot remove the last admin.
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admin only");
    const total = await countAdmins();
    if (total <= 1) throw new Error("Cannot remove the last admin");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
