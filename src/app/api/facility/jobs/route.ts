import { timingSafeEqual } from "node:crypto";
import { processOutbox } from "@/features/facility/server/notify";
import { sweepOverdue } from "@/features/facility/server/requests";

/**
 * Background jobs (call every few minutes from a scheduler, e.g. Vercel Cron or a server cron job):
 *   Authorization: Bearer <FAC_CRON_SECRET>
 * - delivers queued e-mails (with retries)
 * - SLA sweep: notifies Facility Operations once per overdue request
 */
export async function GET(req: Request) {
  const secret = process.env.FAC_CRON_SECRET ?? process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  const overdue = await sweepOverdue();
  const mail = await processOutbox(100);
  return Response.json({ ok: true, overdue, ...mail });
}
