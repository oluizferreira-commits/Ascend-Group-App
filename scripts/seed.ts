import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import * as schema from "../src/db/schema";
import { bootstrapReferenceData, ensureMembership, findUserByEmail } from "../src/db/bootstrap";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  try {
    const { clubId } = await bootstrapReferenceData(db);
    console.log("✔ Organização, clube, cargos, permissões, formações e critérios de avaliação prontos");

    const email = process.env.BOOTSTRAP_PRESIDENT_EMAIL?.trim();
    const password = process.env.BOOTSTRAP_PRESIDENT_PASSWORD;
    const name = process.env.BOOTSTRAP_PRESIDENT_NAME?.trim() || "Presidente";
    if (!email || !password) {
      console.log("ℹ BOOTSTRAP_PRESIDENT_* não definido — nenhuma conta criada.");
      return;
    }
    if (password.length < 10) throw new Error("BOOTSTRAP_PRESIDENT_PASSWORD precisa de ao menos 10 caracteres");
    let user = await findUserByEmail(db, email);
    if (!user) {
      const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
      [user] = await db.insert(schema.users).values({ email, displayName: name, passwordHash }).returning();
      console.log(`✔ Conta de Presidente criada para ${email}`);
    } else {
      console.log(`ℹ Conta ${email} já existe — senha mantida.`);
    }
    await ensureMembership(db, user.id, clubId, "president");
    await db.insert(schema.auditLogs).values({ clubId, actorUserId: null, action: "bootstrap.president", entityType: "user", entityId: user.id });
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
