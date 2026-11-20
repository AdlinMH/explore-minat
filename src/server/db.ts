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

/** Catat error database ke log server tanpa membocorkan connection string. */
export function logDbError(context: string, err: unknown) {
  const e = err as { code?: string; errno?: string; message?: string };
  const message = String(e?.message ?? err).replace(/postgres(ql)?:\/\/\S+/gi, "[DATABASE_URL]");
  console.error(`[db] ${context}: ${e?.code ?? e?.errno ?? "ERROR"} ${message}`);
}
