import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __emkSql?: Sql };

/**
 * Koneksi Postgres server-only ke Supabase. Gunakan connection string
 * "Transaction pooler" (port 6543) di Vercel; prepared statement dimatikan
 * karena pooler mode transaksi tidak mendukungnya.
 */
export function getSql(): Sql {
  if (globalForDb.__emkSql) return globalForDb.__emkSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur di environment server.");
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const sql = postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocal ? false : "require",
    onnotice: () => {},
  });
  globalForDb.__emkSql = sql;
  return sql;
}
