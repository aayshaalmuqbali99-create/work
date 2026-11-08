import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

/**
 * Image storage. Development / single server: files on disk under UPLOAD_DIR, served by /media/[...path].
 * Production with several servers: implement the same `saveImage` with S3 / R2 / Cloudinary.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

export class UploadError extends Error {
  constructor(public code: "TOO_LARGE" | "BAD_TYPE" | "EMPTY") {
    super(code);
  }
}

/** Validates by decoding the actual bytes (not the file name or MIME header), re-encodes to WebP (strips metadata). */
export async function saveImage(file: File): Promise<{ url: string; width: number; height: number }> {
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
  const { data, info } = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const dir = path.join(UPLOAD_DIR, "devices");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, name), data);
  return { url: `/media/devices/${name}`, width: info.width, height: info.height };
}

export const MAX_MODEL_BYTES = 30 * 1024 * 1024;

/** Store an already-validated binary file (e.g. a GLB) under UPLOAD_DIR/<folder>. */
export async function saveBinary(data: Buffer, folder: string, ext: string): Promise<{ url: string }> {
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), data);
  return { url: `/media/${folder}/${name}` };
}
