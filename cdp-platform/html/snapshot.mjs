// Management-level snapshot of a workbook for the ready-made HTML report (run in Node via the same bundled code).
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

export async function snapshot(file, bundle) {
  const code = await bundle(path.join(import.meta.dirname, "snapshot-entry.ts"));
  const sandbox = { TextDecoder, Uint8Array, Intl, Date, console, result: null };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.CDP_SNAPSHOT(new Uint8Array(readFileSync(file)), path.basename(file), statSync(file).mtime.toISOString());
}
