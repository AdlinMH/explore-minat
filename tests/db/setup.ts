import postgres from "postgres";

export const TEST_DB = process.env.TEST_DATABASE_URL;
export const hasDb = Boolean(TEST_DB);

if (TEST_DB) {
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(TEST_DB)) throw new Error("TEST_DATABASE_URL harus database lokal.");
  process.env.DATABASE_URL = TEST_DB;
}

export function adminSql() {
  return postgres(TEST_DB!, { prepare: false, max: 1, onnotice: () => {} });
}

export async function resetDb() {
  const sql = adminSql();
  await sql`truncate public.responses, public.admin_sessions, public.rate_limits cascade`;
  await sql`delete from public.classes where lower(label) not in ('xii rpl 1', 'xii rpl 2')`;
  await sql`update public.classes set is_active = true`;
  const classes = await sql<{ id: string; label: string }[]>`select id, label from public.classes order by sort_order`;
  await sql.end();
  return classes;
}
