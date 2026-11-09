/**
 * Optional whole-site password ("private preview"). Active only when SITE_PASSWORD is set.
 * The cookie holds a SHA-256 of the password + a fixed label, never the password itself.
 * Shared with the edge middleware, so it only uses Web Crypto.
 */
export const ACCESS_COOKIE = "ls_access";

export async function accessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`labsouq-site-access:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
