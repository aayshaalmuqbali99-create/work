import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

/** Creates the first administrator when none exists. Safe to run again. */
const db = new PrismaClient();

async function main() {
  if (await db.user.count({ where: { role: "ADMIN" } })) {
    console.log("An administrator already exists — nothing to do.");
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env");
  await db.user.create({ data: { email, name: process.env.ADMIN_NAME || "CDP Administrator", role: "ADMIN", passwordHash: await hash(password) } });
  console.log(`Administrator created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
