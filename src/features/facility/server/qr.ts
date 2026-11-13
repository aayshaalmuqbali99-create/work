import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site-url";

/** Language-neutral link; the app redirects to the viewer's language. Contains only the random token. */
export const qrUrl = (token: string) => `${SITE_URL}/facility/q/${token}`;

export function qrSvg(token: string) {
  return QRCode.toString(qrUrl(token), { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#1D1D1D", light: "#FFFFFF" } });
}
