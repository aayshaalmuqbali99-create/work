import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site-url";
import { escapeHtml, renderTemplate } from "../domain/template";

type Tx = Prisma.TransactionClient | PrismaClient;
export type EmailVars = Partial<Record<"name" | "reference" | "location" | "status" | "link" | "comment" | "team", string>>;
export type EmailAction = { label: string; url: string; tone: "primary" | "secondary" };

/** Which transport delivers e-mail. "log" (default) records e-mails in the outbox only — safe for development. */
/** Guest identities (open access) have no mailbox. */
export const GUEST_DOMAIN = "@guest.facility-hub.local";

export const emailTransport = () => (process.env.EMAIL_TRANSPORT === "graph" ? "graph" : "log");

function layout(locale: string, subject: string, bodyText: string, actions: EmailAction[]) {
  const rtl = locale === "ar";
  const logo = `${SITE_URL}/brand/omantel/${rtl ? "omantel-bilingual-reverse.png" : "omantel-latin-reverse.png"}`;
  const paragraphs = escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.7">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const buttons = actions
    .map(
      (a) =>
        `<a href="${escapeHtml(a.url)}" style="display:inline-block;margin:4px;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;${
          a.tone === "primary" ? "background:#2D13EA;color:#ffffff" : "background:#ffffff;color:#2D13EA;border:1px solid #2D13EA"
        }">${escapeHtml(a.label)}</a>`,
    )
    .join("");
  return `<!doctype html><html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#F4F3FF;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#1D1D1D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3FF;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#2D13EA;padding:28px 32px"><img src="${logo}" alt="Omantel" height="${rtl ? 44 : 22}" style="display:block;height:${rtl ? 44 : 22}px;width:auto"></td></tr>
<tr><td style="padding:32px;font-size:15px;text-align:${rtl ? "right" : "left"}">${paragraphs}${buttons ? `<div style="margin-top:20px">${buttons}</div>` : ""}</td></tr>
<tr><td style="padding:18px 32px;background:#F4F3FF;color:#5b5b6b;font-size:12px;text-align:${rtl ? "right" : "left"}">${
    rtl ? "مركز مرافق عُمانتل · رسالة آلية، يرجى عدم الرد عليها." : "Omantel Facility Hub · Automated message, please do not reply."
  }</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Queue an e-mail (inside the caller's transaction, so it is only sent if the change is saved).
 * Inactive or missing templates are skipped silently.
 */
export async function enqueueEmail(
  tx: Tx,
  opts: { to: string; templateKey: string; locale: string; vars: EmailVars; requestId?: string; actions?: EmailAction[] },
) {
  if (!opts.to || opts.to.endsWith(GUEST_DOMAIN)) return;
  const tpl = await tx.facEmailTemplate.findUnique({ where: { key: opts.templateKey } });
  if (!tpl || !tpl.active) return;
  const ar = opts.locale === "ar";
  const vars = opts.vars as Record<string, string>;
  const subject = renderTemplate(ar ? tpl.subjectAr : tpl.subjectEn, vars);
  const text = renderTemplate(ar ? tpl.bodyAr : tpl.bodyEn, vars);
  const actions = opts.actions ?? (vars.link ? [{ label: ar ? "عرض الطلب" : "View request", url: vars.link, tone: "primary" as const }] : []);
  const html = layout(opts.locale, subject, text, actions);
  const textWithLinks = [text, ...actions.map((a) => `${a.label}: ${a.url}`)].join("\n\n");
  await tx.facEmailOutbox.create({ data: { to: opts.to, templateKey: opts.templateKey, subject, html, text: textWithLinks, requestId: opts.requestId } });
}

// ---- Delivery ----

let graphToken: { value: string; exp: number } | null = null;
async function graphAccessToken(): Promise<string> {
  if (graphToken && graphToken.exp > Date.now() + 60_000) return graphToken.value;
  const tenant = process.env.GRAPH_TENANT_ID ?? process.env.ENTRA_TENANT_ID;
  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID ?? process.env.ENTRA_CLIENT_ID ?? "",
    client_secret: process.env.GRAPH_CLIENT_SECRET ?? process.env.ENTRA_CLIENT_SECRET ?? "",
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: "POST", body });
  if (!res.ok) throw new Error(`Graph token ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  graphToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return graphToken.value;
}

async function sendViaGraph(to: string, subject: string, html: string) {
  const sender = process.env.GRAPH_SENDER;
  if (!sender) throw new Error("GRAPH_SENDER is not set");
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await graphAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] }, saveToSentItems: false }),
  });
  if (!res.ok) throw new Error(`Graph sendMail ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

let running = false;
/** Deliver pending e-mails. Safe to call often; failed e-mails are retried with back-off (max 5 attempts). */
export async function processOutbox(limit = 25): Promise<{ sent: number; failed: number }> {
  if (running) return { sent: 0, failed: 0 };
  running = true;
  let sent = 0;
  let failed = 0;
  try {
    const batch = await db.facEmailOutbox.findMany({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: limit });
    for (const m of batch) {
      // claim the row so parallel workers don't send twice
      const claimed = await db.facEmailOutbox.updateMany({ where: { id: m.id, status: "PENDING", attempts: m.attempts }, data: { attempts: { increment: 1 } } });
      if (claimed.count === 0) continue;
      try {
        if (emailTransport() === "graph") await sendViaGraph(m.to, m.subject, m.html);
        else console.info(`[facility-mail:log] to=${m.to} subject="${m.subject}"`);
        await db.facEmailOutbox.update({ where: { id: m.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
        sent++;
      } catch (e) {
        const attempts = m.attempts + 1;
        await db.facEmailOutbox.update({
          where: { id: m.id },
          data: { status: attempts >= 5 ? "FAILED" : "PENDING", lastError: String(e).slice(0, 500), nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000) },
        });
        failed++;
      }
    }
  } finally {
    running = false;
  }
  return { sent, failed };
}

export const requestLink = (locale: string, reference: string) => `${SITE_URL}/${locale}/facility/requests/${reference}`;
