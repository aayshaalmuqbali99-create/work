import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/features/admin/queries";
import { Card, StatusBadge } from "@/components/admin/ui";
import { NewUserForm, UserRowActions } from "@/components/admin/user-forms";

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requirePageUser();
  if (me.role !== "ADMIN") redirect({ href: "/admin", locale: await getLocale() });
  const t = await getTranslations("Admin");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }], select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true } });
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">{t("usersTitle")}</h1>
      <p className="text-sm text-muted">{t("usersIntro")}</p>
      <Card>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="font-medium text-navy">{u.name}</p>
                <p className="text-sm text-muted" dir="ltr">{u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusBadge status={u.role === "ADMIN" ? "PUBLISHED" : "DRAFT"} label={t(`role_${u.role}`)} />
                  {!u.active && <StatusBadge status="ARCHIVED" label={t("inactive")} />}
                  <span>{t("lastLogin")}: {u.lastLoginAt ? fmt.format(u.lastLoginAt) : t("never")}</span>
                </div>
              </div>
              <UserRowActions id={u.id} role={u.role} active={u.active} isSelf={u.id === me.id} />
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t("addUser")}><NewUserForm /></Card>
    </div>
  );
}
