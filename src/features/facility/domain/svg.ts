/**
 * Accept only plain, static SVG: no scripts, event handlers, external references, foreignObject or
 * entities. (It is additionally served with a sandboxing CSP and only ever displayed through <img>.)
 */
export function validateSvg(text: string): { width: number; height: number } | null {
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return null;
  if (/<script|<foreignObject|<!ENTITY|<!DOCTYPE|\bon[a-z]+\s*=|javascript:|data:text\/html|<iframe|<embed|<object/i.test(text)) return null;
  if (/(xlink:)?href\s*=\s*["'](?!#|data:image\/)/i.test(text)) return null;
  const tag = text.match(/<svg[^>]*>/i)?.[0] ?? "";
  const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const w = Number(tag.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1] ?? vb?.[1] ?? 0);
  const h = Number(tag.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1] ?? vb?.[2] ?? 0);
  if (!(w > 0 && h > 0)) return null;
  // normalise to a usable pixel size for the viewer
  const scale = Math.max(w, h) < 1000 ? 2000 / Math.max(w, h) : 1;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

