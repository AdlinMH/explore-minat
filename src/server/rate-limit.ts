import "server-only";
import { getSql } from "@/server/db";

export interface RateRule {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Fixed-window counter di Postgres: atomik dan konsisten lintas instance
 * serverless. Mengembalikan false jika salah satu aturan terlampaui.
 */
export async function consumeRateLimits(rules: RateRule[]): Promise<boolean> {
  const sql = getSql();
  let ok = true;
  for (const r of rules) {
    const [row] = await sql<{ count: number }[]>`
      insert into public.rate_limits as rl (bucket, window_start, count)
      values (
        ${r.bucket},
        to_timestamp(floor(extract(epoch from now()) / ${r.windowSeconds}) * ${r.windowSeconds}),
        1
      )
      on conflict (bucket, window_start) do update set count = rl.count + 1
      returning count
    `;
    if (row.count > r.limit) ok = false;
  }
  if (Math.random() < 0.02) {
    await sql`delete from public.rate_limits where window_start < now() - interval '1 day'`;
  }
  return ok;
}
