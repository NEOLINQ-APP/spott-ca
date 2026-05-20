import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateReviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(5).max(2000),
  photo_paths: z.array(z.string().max(300)).max(4).optional().default([]),
});

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateReviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify all paths belong to this user
    for (const p of data.photo_paths) {
      if (!p.startsWith(`${userId}/`)) {
        throw new Error("Invalid photo path");
      }
    }

    // Upsert review (one per business per user)
    const { data: review, error } = await supabase
      .from("reviews")
      .upsert(
        {
          business_id: data.business_id,
          user_id: userId,
          rating: data.rating,
          body: data.body,
        },
        { onConflict: "business_id,user_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.photo_paths.length > 0) {
      // Clear previous photos for this review to avoid duplicates on edit
      await supabase.from("review_photos").delete().eq("review_id", review.id);
      const rows = data.photo_paths.map((path, i) => ({
        review_id: review.id,
        storage_path: path,
        sort_order: i,
      }));
      const { error: phErr } = await supabase.from("review_photos").insert(rows);
      if (phErr) throw new Error(phErr.message);
    }

    return { id: review.id };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ review_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", data.review_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
