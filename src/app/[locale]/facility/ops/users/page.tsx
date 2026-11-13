import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireFacPage } from "@/features/facility/server/guard";
import { formatDate, pickName } from "@/features/facility/format";
import { ActiveDot, ConfigTable } from "@/components/facility/ops/config-table";
import { SampleTag } from "@/components/facility/ui";

export default async function UsersPage() {
  await requireFacPage("users.manage");
  const [t, locale] = await Promise.all([getTranslations("Fac"), getLocale()]);
  const [users, teams] = await Promise.all([db.facUser.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }], include: { team: true }, take: 1000 }), db.facTeam.findMany({ orderBy: { nameEn: "asc" } })]);
  const c = (k: string) => t(`Ops.config.${k}` as "Ops.config.code");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-fink">{c("usersTitle")}</h1>
      <ConfigTable
        entity="user"
        help={c("usersHelp")}
        addLabel={c("addUser")}
        columns={[t("Ops.table.employee"), t("Login.email"), c("role"), c("team"), c("lastLogin"), ""]}
        fields={[
          { name: "name", label: t("Ops.table.employee"), type: "text" },
          { name: "email", label: t("Login.email"), type: "email" },
          { name: "role", label: c("role"), type: "select", options: (["EMPLOYEE", "CONTRACTOR", "AGENT", "ADMIN"] as const).map((r) => ({ value: r, label: t(`Ops.role.${r}`) })) },
          { name: "teamId", label: c("team"), type: "select", nullable: true, options: teams.map((x) => ({ value: x.id, label: pickName(x, locale) })), help: t("Ops.role.CONTRACTOR") },
          { name: "department", label: t("Wizard.department"), type: "text" },
          { name: "phone", label: t("Wizard.phone"), type: "text", dir: "ltr" },
          { name: "active", label: t("Common.active"), type: "bool" },
        ]}
        defaults={{ name: "", email: "", role: "EMPLOYEE", teamId: "", department: "", phone: "", active: true }}
        rows={users.map((u) => ({
          id: u.id, inactive: !u.active,
          values: { name: u.name, email: u.email, role: u.role, teamId: u.teamId ?? "", department: u.department, phone: u.phone, active: u.active },
          cells: [
            <span key="n" className="font-semibold">{u.name} {u.isSample && <SampleTag label={t("Common.sample")} />}</span>,
            <span key="e" dir="ltr" className="text-xs">{u.email}</span>,
            t(`Ops.role.${u.role}`),
            u.team ? pickName(u.team, locale) : "—",
            <span key="l" className="text-xs text-fmuted">{u.lastLoginAt ? formatDate(u.lastLoginAt, locale, true) : c("never")}</span>,
            <ActiveDot key="a" active={u.active} label={u.active ? t("Common.active") : t("Common.inactive")} />,
          ],
        }))}
      />
    </div>
  );
}
