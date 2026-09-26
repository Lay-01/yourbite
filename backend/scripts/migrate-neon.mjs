import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const { Client } = pg;
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationDirectory = path.resolve(here, "../db/migrations");
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(`create table if not exists public.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);
  const files = (await fs.readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const existing = await client.query("select 1 from public.schema_migrations where version = $1", [file]);
    if (existing.rowCount) {
      console.log(`Already applied: ${file}`);
      continue;
    }
    await client.query(await fs.readFile(path.join(migrationDirectory, file), "utf8"));
    await client.query("insert into public.schema_migrations (version) values ($1) on conflict do nothing", [file]);
    console.log(`Applied: ${file}`);
  }
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}