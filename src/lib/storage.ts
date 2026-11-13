import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

/**
 * File storage with two interchangeable back-ends. Stored URLs are always `/media/<key>` and are
 * served by src/app/media/[...path]/route.ts, so switching back-end never changes saved links.
 *
 *  - Local disk (default): files under UPLOAD_DIR. For one server with a persistent disk (VPS / Docker volume).
 *  - S3-compatible object storage (Cloudflare R2, AWS S3, DigitalOcean Spaces, MinIO): set S3_BUCKET and
 *    credentials. Required on Vercel, whose file system is not persistent.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_MODEL_BYTES = 30 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);
const useS3 = !!process.env.S3_BUCKET;
/** Database storage: explicit (STORAGE_BACKEND=db) or automatic on Vercel when no bucket is configured. */
const useDb = !useS3 && (process.env.STORAGE_BACKEND === "db" || !!process.env.VERCEL);
async function storeDb() {
  return (await import("./db")).db;
}

export class UploadError extends Error {
  constructor(public code: "TOO_LARGE" | "BAD_TYPE" | "EMPTY") {
    super(code);
  }
}

let s3Client: import("@aws-sdk/client-s3").S3Client | null = null;
async function s3() {
  const sdk = await import("@aws-sdk/client-s3");
  s3Client ??= new sdk.S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  return { sdk, client: s3Client, bucket: process.env.S3_BUCKET! };
}

/** Keys look like "devices/<uuid>.webp" — only these characters are ever accepted. */
const KEY_RE = /^[a-z0-9-]+\/[a-f0-9-]+\.(webp|jpg|jpeg|png|glb|svg)$/;

function localPath(key: string) {
  const file = path.resolve(UPLOAD_DIR, key);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) throw new Error("bad key");
  return file;
}

async function put(key: string, data: Buffer, contentType: string) {
  if (useDb) {
    const bytes = new Uint8Array(data);
    await (await storeDb()).storedFile.upsert({ where: { key }, update: { data: bytes, contentType, size: bytes.length }, create: { key, data: bytes, contentType, size: bytes.length } });
  } else if (useS3) {
    const { sdk, client, bucket } = await s3();
    await client.send(new sdk.PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
  } else {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return `/media/${key}`;
}

/** Read a stored file by key; null when missing or the key is not valid. */
export async function readStored(key: string): Promise<Buffer | null> {
  if (!KEY_RE.test(key)) return null;
  try {
    if (useDb) {
      const row = await (await storeDb()).storedFile.findUnique({ where: { key } });
      return row ? Buffer.from(row.data) : null;
    }
    if (useS3) {
      const { sdk, client, bucket } = await s3();
      const res = await client.send(new sdk.GetObjectCommand({ Bucket: bucket, Key: key }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    }
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

/** Delete a stored file given its `/media/...` URL. Silently ignores anything else. */
export async function deleteStored(url: string) {
  const key = url.startsWith("/media/") ? url.slice("/media/".length) : "";
  if (!KEY_RE.test(key)) return;
  try {
    if (useDb) {
      await (await storeDb()).storedFile.deleteMany({ where: { key } });
      return;
    }
    if (useS3) {
      const { sdk, client, bucket } = await s3();
      await client.send(new sdk.DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } else {
      await unlink(localPath(key));
    }
  } catch {
    /* already gone */
  }
}

/** Validates by decoding the actual bytes (not the file name or MIME header), re-encodes to WebP (strips metadata). */
export async function saveImage(file: File, folder = "devices", maxSide = 1600): Promise<{ url: string; key: string; width: number; height: number }> {
  if (!file || file.size === 0) throw new UploadError("EMPTY");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("TOO_LARGE");
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new UploadError("BAD_TYPE");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new UploadError("BAD_TYPE");
  const { data, info } = await sharp(input).rotate().resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const key = `${folder}/${randomUUID()}.webp`;
  const url = await put(key, data, "image/webp");
  return { url, key, width: info.width, height: info.height };
}

/** Store an already-validated binary file (e.g. a GLB). */
export async function saveBinary(data: Buffer, folder: string, ext: string): Promise<{ url: string; key: string }> {
  const types: Record<string, string> = { glb: "model/gltf-binary", svg: "image/svg+xml" };
  const key = `${folder}/${randomUUID()}.${ext}`;
  return { url: await put(key, data, types[ext] ?? "application/octet-stream"), key };
}

/** Folders whose files are private: served only through authorised routes, never through /media. */
export const PRIVATE_FOLDERS = ["facility", "facmaps"];
export const isPrivateKey = (key: string) => PRIVATE_FOLDERS.some((f) => key.startsWith(`${f}/`));
