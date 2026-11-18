import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/page";
import { Card, StatusBadge } from "@/components/ui";
import { NewUserForm, UserRowActions } from "@/components/users/user-forms";

export const dynamic = "force-dynamic";

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requirePageUser("ADMIN");
  const t = await getTranslations("Admin");
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, cdpRaw: true, lastLoginAt: true },
  });
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold text-navy">{t("usersTitle")}</h1>
      <p className="text-sm text-muted">{t("usersIntro")}</p>
      <Card>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="font-bold text-ink">{u.name}</p>
                <p className="text-sm text-muted" dir="ltr">{u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusBadge status={u.role === "ADMIN" ? "PUBLISHED" : "DRAFT"} label={t(`role_${u.role}`)} />
                  {!u.active && <StatusBadge status="ARCHIVED" label={t("inactive")} />}
                  {(u.cdpRaw || u.role === "ADMIN") && <StatusBadge status="REVIEW" label={t("cdpRawShort")} />}
                  <span>{t("lastLogin")}: {u.lastLoginAt ? fmt.format(u.lastLoginAt) : t("never")}</span>
                </div>
              </div>
              <UserRowActions id={u.id} role={u.role} active={u.active} cdpRaw={u.cdpRaw} isSelf={u.id === me.id} />
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t("addUser")}>
        <NewUserForm />
      </Card>
    </main>
  );
}
