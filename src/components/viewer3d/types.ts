export type V3 = [number, number, number];

export type Shape =
  | { kind: "box"; size: V3 }
  | { kind: "cyl"; r: number; h: number; rTop?: number; seg?: number }
  | { kind: "torus"; r: number; tube: number; arc?: number }
  | { kind: "sphere"; r: number };

export interface MeshSpec {
  shape: Shape;
  pos: V3;
  /** Euler rotation in radians */
  rot?: V3;
  color: string;
  metal?: number;
  rough?: number;
  emissive?: string;
}

export interface PartSpec {
  id: string;
  en: string;
  ar: string;
  fnEn: string;
  fnAr: string;
  meshes: MeshSpec[];
  /** Direction and distance the part travels in exploded view (scaled by the distance slider). */
  explode: V3;
  /** Parent part id for the component tree; undefined = top-level assembly part. */
  parent?: string;
}

export interface Archetype {
  key: string;
  en: string;
  ar: string;
  parts: PartSpec[];
  /** Radius used to frame the camera. */
  size: number;
}

/** A configured part of a real (GLB) model. `node` is the node name in the GLB file. */
export interface PartInfo {
  id: string;
  node?: string;
  en: string;
  ar: string;
  fnEn: string;
  fnAr: string;
  parent?: string | null;
  /** Explode direction/distance in scene units; null = automatic (away from the model centre). */
  explode: V3 | null;
}

/** What the public viewer shows for a device. */
export type ViewerModel = { type: "illustrative"; key: string } | { type: "verified"; url: string; parts: PartInfo[] };
