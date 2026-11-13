import { getLocale, getTranslations } from "next-intl/server";
import { HubHeader } from "@/components/facility/hub-header";
import { HubFooter } from "@/components/facility/hub-footer";
import { getFacUser } from "@/features/facility/server/session";
import { myNotifications } from "@/features/facility/server/queries";
import { isGuestEmail } from "@/features/facility/server/notify";
import { can } from "@/features/facility/domain/permissions";
import { relativeTime } from "@/features/facility/format";

/** Employee experience chrome: floating navigation + footer. */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const [user, locale, t] = await Promise.all([getFacUser(), getLocale(), getTranslations("Fac")]);
  const events = user ? await myNotifications(user.id) : [];
  const notifications = events.map((e) => ({
    id: e.id,
    reference: e.request.reference,
    text: e.status ? t(`Status.${e.status}`) : t(`Detail.events.${e.type as "COMMENT"}`),
    when: relativeTime(e.createdAt, locale),
  }));
  return (
    <>
      <HubHeader
        user={user ? { name: user.name, email: user.email, role: t(`Ops.role.${user.role}`), canOps: can(user.role, "ops.view"), guest: isGuestEmail(user.email) } : null}
        notifications={notifications}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <HubFooter />
    </>
  );
}
