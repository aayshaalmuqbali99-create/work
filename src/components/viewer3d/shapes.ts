import type { MeshSpec, V3 } from "./types";

/** Shared palette for the illustrative models. */
export const C = {
  case: "#d5dbdf",
  panel: "#eef1f2",
  dark: "#1f2b33",
  navy: "#102f40",
  pcb: "#1d6b4e",
  chip: "#15191c",
  metal: "#9aa5ad",
  copper: "#b87333",
  red: "#c0392b",
  black: "#202326",
  screen: "#0b2a33",
  glow: "#3fb8be",
  yellow: "#e2b33c",
  white: "#f7f8f8",
  blue: "#2f6fb3",
  glass: "#a9d6e5",
} as const;

export const box = (size: V3, pos: V3, color: string, extra: Partial<MeshSpec> = {}): MeshSpec => ({
  shape: { kind: "box", size },
  pos,
  color,
  ...extra,
});

/** Cylinder; `axis` turns the default Y-axis cylinder to face X or Z. */
export const cyl = (
  r: number,
  h: number,
  pos: V3,
  color: string,
  axis: "x" | "y" | "z" = "y",
  extra: Partial<MeshSpec> = {},
): MeshSpec => ({
  shape: { kind: "cyl", r, h },
  pos,
  rot: axis === "z" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, 0, Math.PI / 2] : [0, 0, 0],
  color,
  ...extra,
});

export const cone = (r: number, rTop: number, h: number, pos: V3, color: string, axis: "x" | "y" | "z" = "y"): MeshSpec => ({
  shape: { kind: "cyl", r, rTop, h },
  pos,
  rot: axis === "z" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, 0, Math.PI / 2] : [0, 0, 0],
  color,
});

export const torus = (r: number, tube: number, pos: V3, color: string, rot: V3 = [0, 0, 0], extra: Partial<MeshSpec> = {}): MeshSpec => ({
  shape: { kind: "torus", r, tube },
  pos,
  rot,
  color,
  ...extra,
});

/** Repeat a mesh factory over a grid of positions. */
export function grid(cols: number, rows: number, origin: V3, step: [number, number], plane: "xy" | "xz", make: (p: V3, i: number) => MeshSpec): MeshSpec[] {
  const out: MeshSpec[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const p: V3 =
        plane === "xy"
          ? [origin[0] + c * step[0], origin[1] - r * step[1], origin[2]]
          : [origin[0] + c * step[0], origin[1], origin[2] + r * step[1]];
      out.push(make(p, r * cols + c));
    }
  return out;
}
