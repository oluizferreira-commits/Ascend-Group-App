import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __ascendSql?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada. Veja .env.example.");
  // Small pool per serverless instance; prepare:false keeps it compatible with PgBouncer/Neon/Supabase poolers.
  return postgres(url, { max: process.env.NODE_ENV === "production" ? 5 : 10, prepare: false, idle_timeout: 20 });
}

// Reuse one pool across hot reloads in development.
const client = globalForDb.__ascendSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__ascendSql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
