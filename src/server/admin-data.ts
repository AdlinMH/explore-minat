import "server-only";
import { getSql } from "@/server/db";
import type { Filters } from "@/lib/validation";
import type { StatRow } from "@/lib/stats";
import type { ExplorationStatusId } from "@/config/questionnaire";

/**
 * Semua fungsi di sini hanya boleh dipanggil setelah requireAdmin()/
 * validateSessionToken() berhasil di pemanggil.
 */

export const PAGE_SIZE = 20;

type Sql = ReturnType<typeof getSql>;

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Filter kelas & tanggal (Asia/Jakarta). Berlaku untuk KPI, chart, tabel, ekspor. */
function baseWhere(sql: Sql, f: Filters) {
  return sql`
    ${f.kelas ? sql`and r.class_id = ${f.kelas}` : sql``}
    ${f.dari ? sql`and r.created_at >= (${f.dari}::date)::timestamp at time zone 'Asia/Jakarta'` : sql``}
    ${f.sampai ? sql`and r.created_at < ((${f.sampai}::date + 1)::timestamp at time zone 'Asia/Jakarta')` : sql``}
  `;
}

/** Pencarian nama: hanya untuk tabel dan ekspor. */
function searchWhere(sql: Sql, f: Filters) {
  return f.cari ? sql`and r.name ilike ${"%" + escapeLike(f.cari) + "%"} escape '\\'` : sql``;
}

export async function getStatRows(f: Filters): Promise<StatRow[]> {
  const sql = getSql();
  const rows = await sql<{ class_id: string; scores: Record<string, number>; exploration_status: ExplorationStatusId; other_interest: string | null }[]>`
    select r.class_id, r.scores, r.exploration_status, r.other_interest
    from public.responses r where true ${baseWhere(sql, f)}
  `;
  return rows.map((r) => ({
    classId: r.class_id,
    scores: r.scores,
    explorationStatus: r.exploration_status,
    otherInterest: r.other_interest,
  }));
}

export interface TableRow {
  id: string;
  name: string;
  class_label: string;
  created_at: Date;
  highest_category_ids: string[];
  result_pattern: string;
  exploration_status: ExplorationStatusId;
}

export async function getTablePage(f: Filters) {
  const sql = getSql();
  const page = f.hal ?? 1;
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from public.responses r where true ${baseWhere(sql, f)} ${searchWhere(sql, f)}
  `;
  const rows = await sql<TableRow[]>`
    select r.id, r.name, c.label as class_label, r.created_at, r.highest_category_ids, r.result_pattern, r.exploration_status
    from public.responses r join public.classes c on c.id = r.class_id
    where true ${baseWhere(sql, f)} ${searchWhere(sql, f)}
    order by r.created_at desc, r.id
    limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}
  `;
  return { total: count, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)), rows };
}

export async function getOtherInterests(f: Filters) {
  const sql = getSql();
  return sql<{ id: string; name: string; class_label: string; other_interest: string; created_at: Date }[]>`
    select r.id, r.name, c.label as class_label, r.other_interest, r.created_at
    from public.responses r join public.classes c on c.id = r.class_id
    where r.other_interest is not null and r.other_interest <> '' ${baseWhere(sql, f)}
    order by r.created_at desc limit 100
  `;
}

export async function getExportRows(f: Filters) {
  const sql = getSql();
  return sql<{
    id: string; name: string; class_label: string; created_at: Date; questionnaire_version: string;
    answers: Record<string, number>; scores: Record<string, number>; highest_category_ids: string[];
    result_pattern: string; exploration_status: string; other_interest: string | null; reflection: string | null;
  }[]>`
    select r.id, r.name, c.label as class_label, r.created_at, r.questionnaire_version, r.answers, r.scores,
           r.highest_category_ids, r.result_pattern, r.exploration_status, r.other_interest, r.reflection
    from public.responses r join public.classes c on c.id = r.class_id
    where true ${baseWhere(sql, f)} ${searchWhere(sql, f)}
    order by r.created_at asc
    limit 20000
  `;
}

export async function listAllClasses() {
  return getSql()<{ id: string; label: string; is_active: boolean; sort_order: number; response_count: number }[]>`
    select c.id, c.label, c.is_active, c.sort_order,
           (select count(*)::int from public.responses r where r.class_id = c.id) as response_count
    from public.classes c order by c.sort_order, c.label
  `;
}

export async function addClass(label: string) {
  const sql = getSql();
  const rows = await sql`
    insert into public.classes (label, sort_order)
    values (${label}, (select coalesce(max(sort_order), 0) + 1 from public.classes))
    on conflict ((lower(label))) do nothing returning id
  `;
  return rows.length > 0;
}

export async function renameClass(id: string, label: string) {
  const sql = getSql();
  try {
    const rows = await sql`update public.classes set label = ${label}, updated_at = now() where id = ${id} returning id`;
    return rows.length > 0;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return false;
    throw e;
  }
}

export async function setClassActive(id: string, active: boolean) {
  await getSql()`update public.classes set is_active = ${active}, updated_at = now() where id = ${id}`;
}

/** Hanya kelas tanpa respons yang boleh dihapus; kelas berisi respons dinonaktifkan. */
export async function deleteClassIfEmpty(id: string) {
  const rows = await getSql()`
    delete from public.classes c where c.id = ${id}
      and not exists (select 1 from public.responses r where r.class_id = c.id)
    returning id
  `;
  return rows.length > 0;
}
