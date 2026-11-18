import { importWorkbook } from "../src/features/cdp/parse";
import { buildView } from "./view";

(globalThis as unknown as { CDP_SNAPSHOT: unknown }).CDP_SNAPSHOT = (data: Uint8Array, fileName: string, updated: string) => {
  const { dataset, report } = importWorkbook(data);
  if (report.errors.length) throw new Error("The file has errors: " + report.errors.map((e) => e.code).join(", "));
  return buildView(dataset, { management: true, fileName, updated });
};
