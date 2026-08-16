import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPresignedUploadUrl, deleteStoredObject } from "./barioStorage.server";

// Allowlist, not a free-form folder param — keeps uploads confined to
// spott.ca's own space in the shared bucket regardless of what a client
// sends.
const ALLOWED_FOLDERS = {
  marketplace: "spott/images/marketplace",
  vehicle: "spott/images/vehicles",
  business: "spott/images/business",
} as const;

const InputSchema = z.object({
  kind: z.enum(["marketplace", "vehicle", "business"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|webp|gif)$/, "Unsupported image type"),
});

// Called client-side before uploading a photo — returns a short-lived
// presigned PUT URL the browser uploads directly to (storage.bario.ca never
// sees a Supabase session, and spott.ca's server never touches the file
// bytes), plus the permanent public URL to store once the upload succeeds.
export const getPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const folder = ALLOWED_FOLDERS[data.kind];
    const result = await createPresignedUploadUrl(folder, data.filename, data.contentType);
    return result;
  });

// Deletion needs storage credentials the browser can't safely hold, same
// reasoning as the presigned-upload flow above. Requires auth but not
// ownership of this specific key — matches the trust level the code this
// replaced had (RLS on the DB row is the real authorization boundary; this
// only removes the underlying file after that row's already gone).
const DeleteInputSchema = z.object({ key: z.string().min(1).max(500) });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInputSchema.parse(input))
  .handler(async ({ data }) => {
    await deleteStoredObject(data.key).catch(() => {});
    return { ok: true };
  });
