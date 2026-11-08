import "server-only";

/**
 * Minimal, dependency-free GLB (binary glTF 2.0) validator.
 * Checks the container structure and the JSON chunk, refuses external references,
 * and returns the information the 3D editor needs.
 */
export class GlbError extends Error {
  constructor(public code: "NOT_GLB" | "BAD_VERSION" | "CORRUPT" | "EXTERNAL_REFS" | "NO_MESHES" | "TOO_COMPLEX") {
    super(code);
  }
}

export const MAX_TRIANGLES = 1_500_000;

interface GltfJson {
  asset?: { version?: string };
  scenes?: { nodes?: number[] }[];
  scene?: number;
  nodes?: { name?: string; mesh?: number; children?: number[] }[];
  meshes?: { primitives: { attributes: Record<string, number>; indices?: number; mode?: number }[] }[];
  accessors?: { count: number }[];
  buffers?: { uri?: string; byteLength: number }[];
  images?: { uri?: string; bufferView?: number }[];
}

export function inspectGlb(buf: Buffer) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new GlbError("NOT_GLB"); // "glTF"
  if (buf.readUInt32LE(4) !== 2) throw new GlbError("BAD_VERSION");
  if (buf.readUInt32LE(8) !== buf.length) throw new GlbError("CORRUPT");
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLen > buf.length) throw new GlbError("CORRUPT"); // "JSON"
  let json: GltfJson;
  try {
    json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  } catch {
    throw new GlbError("CORRUPT");
  }
  if (!json.asset?.version?.startsWith("2")) throw new GlbError("BAD_VERSION");
  // Only the embedded binary chunk may be used — no external files or URLs.
  if (json.buffers?.some((b) => b.uri !== undefined) || json.images?.some((i) => i.uri !== undefined && !i.uri.startsWith("data:image/"))) {
    throw new GlbError("EXTERNAL_REFS");
  }
  if (!json.meshes?.length) throw new GlbError("NO_MESHES");

  let triangles = 0;
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      if (p.mode !== undefined && p.mode !== 4) continue; // only TRIANGLES
      const acc = p.indices !== undefined ? json.accessors?.[p.indices] : json.accessors?.[p.attributes.POSITION];
      triangles += Math.floor((acc?.count ?? 0) / 3);
    }
  }
  if (triangles > MAX_TRIANGLES) throw new GlbError("TOO_COMPLEX");

  // Candidate part nodes: the children of the scene root (or of the single root node).
  const nodes = json.nodes ?? [];
  const sceneRoots = json.scenes?.[json.scene ?? 0]?.nodes ?? [];
  const level = sceneRoots.length === 1 && nodes[sceneRoots[0]]?.children?.length ? nodes[sceneRoots[0]].children! : sceneRoots;
  const nodeNames = [...new Set(level.map((i) => nodes[i]?.name).filter((n): n is string => !!n))];
  return { triangles, nodeNames };
}
