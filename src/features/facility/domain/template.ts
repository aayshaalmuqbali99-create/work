/** Minimal, safe {{placeholder}} rendering for e-mail templates. Values are HTML-escaped for the HTML part. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderTemplate(tpl: string, vars: Record<string, string>, html = false): string {
  return tpl.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k] ?? "";
    return html ? escapeHtml(v) : v;
  });
}

export const TEMPLATE_VARIABLES = ["name", "reference", "location", "status", "link", "comment", "team"] as const;
