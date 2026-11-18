/** Browser stand-in for node:crypto createHash(...).update(s).digest("hex") — only used for stable comment keys. */
function cyrb(str: string, seed: number) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
export function createHash() {
  let data = "";
  const api = {
    update(s: string) {
      data += s;
      return api;
    },
    digest() {
      return cyrb(data, 1) + cyrb(data, 2) + cyrb(data, 3);
    },
  };
  return api;
}
