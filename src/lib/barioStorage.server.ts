// Server-only S3-compatible client for spott.ca's file storage — the
// self-hosted MinIO backend on Bario's own Hetzner VPS (storage.bario.ca),
// not Supabase Storage. Supabase's marketplace-photos/vehicle-photos/
// business-photos buckets referenced elsewhere in this codebase never
// actually existed on the live project (confirmed via a real API check —
// every upload against them silently failed), so this is a genuine fix,
// not a migration off working infrastructure.
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = "bario-storage";
const PUBLIC_BASE = "https://storage.bario.ca/bario-storage";
const ENDPOINT = "https://storage.bario.ca";

let _client: S3Client | undefined;
function client(): S3Client {
  if (!_client) {
    const accessKeyId = process.env.BARIO_STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.BARIO_STORAGE_SECRET_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("BARIO_STORAGE_ACCESS_KEY/BARIO_STORAGE_SECRET_KEY not configured");
    }
    _client = new S3Client({
      endpoint: ENDPOINT,
      region: "us-east-1", // MinIO ignores region, but the SDK requires one
      forcePathStyle: true, // MinIO uses path-style URLs (endpoint/bucket/key), not virtual-hosted
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type PresignedUploadResult = { uploadUrl: string; publicUrl: string; key: string };

// folder should be one of the real subfolders already provisioned:
// "spott/images/marketplace", "spott/images/vehicles", "spott/images/business"
export async function createPresignedUploadUrl(
  folder: string,
  filename: string,
  contentType: string,
): Promise<PresignedUploadResult> {
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  const key = `${folder}/${Date.now()}-${randomSuffix()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { uploadUrl, publicUrl: `${PUBLIC_BASE}/${key}`, key };
}

// Direct server-side upload (raw bytes, not a presigned browser URL) — for
// server jobs that already have the file in hand, like the Google Places
// photo ingest pipeline, rather than a client uploading through the browser.
export async function putObject(
  folder: string,
  filename: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ publicUrl: string; key: string }> {
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  const key = `${folder}/${Date.now()}-${randomSuffix()}.${ext}`;
  await client().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: contentType }));
  return { publicUrl: `${PUBLIC_BASE}/${key}`, key };
}

export async function deleteStoredObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export { resolveStoredUrl } from "./barioStorageUrl";
