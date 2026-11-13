import path from "node:path";
import { isPrivateKey, readStored } from "@/lib/storage";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".glb": "model/gltf-binary" };

/**
 * Serves uploaded files from local disk or S3-compatible storage (see src/lib/storage.ts).
 * File names are random UUIDs, so responses are cached for a year by browsers and CDNs.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/");
  // Facility request photos and floor plans are private (see /api/facility/...).
  if (isPrivateKey(key)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(key).toLowerCase()];
  const data = type ? await readStored(key) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
