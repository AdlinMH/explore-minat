import "server-only";
import { getSql } from "@/server/db";
import { QUESTIONNAIRE_VERSION, type ExplorationStatusId } from "@/config/questionnaire";
import { computeScores, scoresToRecord, validateAnswers, type ResultPattern } from "@/lib/scoring";
import { sha256Hex } from "@/lib/security/crypto";
import type { Submission } from "@/lib/validation";
import { consumeRateLimits } from "@/server/rate-limit";

export function ownerTokenHash(submissionKey: string): string {
  return sha256Hex(`owner:${submissionKey.toLowerCase()}`);
}

export type SaveResult =
  | { ok: true; responseId: string; duplicate: boolean }
  | { ok: false; reason: "class_inactive" | "limited" };

/**
 * Menyimpan respons secara idempoten berdasarkan submission_key. Skor selalu
 * dihitung ulang di server dari 24 jawaban valid.
 */
export async function saveResponse(input: Submission, clientKey: string): Promise<SaveResult> {
  const sql = getSql();
  const answers = validateAnswers(input.answers);

  const [existing] = await sql<{ id: string }[]>`
    select id from public.responses where submission_key = ${input.submissionKey}
  `;
  if (existing) return { ok: true, responseId: existing.id, duplicate: true };

  const [cls] = await sql<{ id: string }[]>`
    select id from public.classes where id = ${input.classId} and is_active
  `;
  if (!cls) return { ok: false, reason: "class_inactive" };

  const allowed = await consumeRateLimits([
    { bucket: `submit:ip:${clientKey}`, limit: 150, windowSeconds: 10 * 60 },
    { bucket: "submit:global", limit: 3000, windowSeconds: 10 * 60 },
  ]);
  if (!allowed) return { ok: false, reason: "limited" };

  const result = computeScores(answers);
  const rows = await sql<{ id: string }[]>`
    insert into public.responses (
      submission_key, owner_token_hash, name, class_id, questionnaire_version, answers, scores,
      top_category_ids, highest_category_ids, result_pattern, exploration_status, other_interest, reflection
    ) values (
      ${input.submissionKey}, ${ownerTokenHash(input.submissionKey)}, ${input.name}, ${input.classId},
      ${QUESTIONNAIRE_VERSION}, ${sql.json(answers)}, ${sql.json(scoresToRecord(result))},
      ${result.topGroup}, ${result.highest}, ${result.pattern}, ${input.explorationStatus},
      ${input.otherInterest}, ${input.reflection}
    )
    on conflict (submission_key) do nothing
    returning id
  `;
  if (rows[0]) return { ok: true, responseId: rows[0].id, duplicate: false };
  const [again] = await sql<{ id: string }[]>`select id from public.responses where submission_key = ${input.submissionKey}`;
  return { ok: true, responseId: again.id, duplicate: true };
}

export interface ResponseRow {
  id: string;
  name: string;
  class_id: string;
  class_label: string;
  questionnaire_version: string;
  answers: Record<string, number>;
  scores: Record<string, number>;
  top_category_ids: string[];
  highest_category_ids: string[];
  result_pattern: ResultPattern;
  exploration_status: ExplorationStatusId;
  other_interest: string | null;
  reflection: string | null;
  created_at: Date;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Respons hanya dikembalikan jika token pemilik (cookie) cocok. */
export async function getOwnedResponse(id: string, ownerKey: string | undefined | null): Promise<ResponseRow | null> {
  if (!UUID_RE.test(id) || !ownerKey || !UUID_RE.test(ownerKey)) return null;
  const sql = getSql();
  const [row] = await sql<ResponseRow[]>`
    select r.*, c.label as class_label
    from public.responses r join public.classes c on c.id = r.class_id
    where r.id = ${id} and r.owner_token_hash = ${ownerTokenHash(ownerKey)}
  `;
  return row ?? null;
}

/** Hanya untuk pemanggil yang sudah memverifikasi sesi admin. */
export async function getResponseForAdmin(id: string): Promise<ResponseRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await getSql()<ResponseRow[]>`
    select r.*, c.label as class_label
    from public.responses r join public.classes c on c.id = r.class_id
    where r.id = ${id}
  `;
  return row ?? null;
}

export async function listActiveClasses() {
  return getSql()<{ id: string; label: string }[]>`
    select id, label from public.classes where is_active order by sort_order, label
  `;
}
