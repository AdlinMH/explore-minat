import "server-only";
import { getSql } from "@/server/db";
import { consumeRateLimits } from "@/server/rate-limit";
import { aiConfig, classifyAiError, openAiCaller, type AiCaller } from "@/server/openai";
import { buildAiPayload, type ExplanationContext } from "@/lib/explanation/payload";
import { templateExplanation } from "@/lib/explanation/template";
import { PROMPT_VERSION, type ExplanationContent, type ExplanationView } from "@/lib/explanation/types";
import { validateAiOutput } from "@/lib/explanation/validate";
import type { ResponseRow } from "@/server/responses";
import type { CategoryId } from "@/config/questionnaire";

export const LEASE_SECONDS = 45;
const MAX_ATTEMPTS = 2;
const RETRYABLE = ["timeout", "connection", "rate_limit", "server_error", "busy"];

export type ExplanationState =
  | { status: "success"; view: ExplanationView }
  | { status: "pending"; view: ExplanationView }
  | { status: "fallback"; view: ExplanationView; retryable: boolean };

export function contextFromRow(row: ResponseRow): ExplanationContext {
  return {
    questionnaireVersion: row.questionnaire_version,
    answers: row.answers,
    scores: row.scores,
    topGroup: row.top_category_ids as CategoryId[],
    pattern: row.result_pattern,
    explorationStatus: row.exploration_status,
  };
}

interface CacheRow {
  id: string;
  status: "pending" | "success" | "fallback";
  content: ExplanationContent | null;
  error_code: string | null;
  attempts: number;
  lease_until: Date | null;
  updated_at: Date;
}

function template(ctx: ExplanationContext): ExplanationView {
  return { source: "template", content: templateExplanation(ctx) };
}

function stateFromCache(row: CacheRow | undefined, ctx: ExplanationContext): ExplanationState | null {
  if (!row) return null;
  if (row.status === "success" && row.content) return { status: "success", view: { source: "ai", content: row.content } };
  if (row.status === "pending" && row.lease_until && row.lease_until > new Date()) {
    return { status: "pending", view: template(ctx) };
  }
  const retryable = row.attempts < MAX_ATTEMPTS && (row.status === "pending" || RETRYABLE.includes(row.error_code ?? ""));
  return { status: "fallback", view: template(ctx), retryable };
}

/** Membaca cache saja (tanpa memanggil AI). Dipakai saat render halaman. */
export async function readExplanation(row: ResponseRow): Promise<ExplanationState & { aiEnabled: boolean }> {
  const ctx = contextFromRow(row);
  const cfg = aiConfig();
  if (!cfg.enabled) return { status: "fallback", view: template(ctx), retryable: false, aiEnabled: false };
  const [cache] = await getSql()<CacheRow[]>`
    select id, status, content, error_code, attempts, lease_until, updated_at
    from public.result_explanations
    where response_id = ${row.id} and questionnaire_version = ${row.questionnaire_version}
      and prompt_version = ${PROMPT_VERSION} and model = ${cfg.model}
  `;
  const state = stateFromCache(cache, ctx);
  if (!state) return { status: "fallback", view: template(ctx), retryable: true, aiEnabled: true };
  return { ...state, aiEnabled: true };
}

/**
 * Mengklaim pekerjaan generasi secara atomik lalu memanggil AI dalam lifecycle
 * request ini. Pemanggil WAJIB sudah memverifikasi kepemilikan respons atau sesi admin.
 */
export async function ensureExplanation(row: ResponseRow, caller: AiCaller = openAiCaller): Promise<ExplanationState> {
  const ctx = contextFromRow(row);
  const cfg = aiConfig();
  if (!cfg.enabled) return { status: "fallback", view: template(ctx), retryable: false };
  const sql = getSql();

  const claimed = await sql<{ id: string }[]>`
    insert into public.result_explanations as e
      (response_id, questionnaire_version, prompt_version, model, status, attempts, lease_until)
    values (${row.id}, ${row.questionnaire_version}, ${PROMPT_VERSION}, ${cfg.model}, 'pending', 1,
            now() + make_interval(secs => ${LEASE_SECONDS}))
    on conflict (response_id, questionnaire_version, prompt_version, model) do update
      set status = 'pending', attempts = e.attempts + 1,
          lease_until = now() + make_interval(secs => ${LEASE_SECONDS}), updated_at = now()
      where e.attempts < ${MAX_ATTEMPTS}
        and (
          (e.status = 'pending' and e.lease_until < now())
          or (e.status = 'fallback' and e.error_code = any(${RETRYABLE}) and e.updated_at < now() - interval '20 seconds')
        )
    returning id
  `;

  if (!claimed[0]) {
    const [cache] = await sql<CacheRow[]>`
      select id, status, content, error_code, attempts, lease_until, updated_at from public.result_explanations
      where response_id = ${row.id} and questionnaire_version = ${row.questionnaire_version}
        and prompt_version = ${PROMPT_VERSION} and model = ${cfg.model}
    `;
    return stateFromCache(cache, ctx) ?? { status: "fallback", view: template(ctx), retryable: false };
  }

  const jobId = claimed[0].id;
  const finish = async (status: "success" | "fallback", content: ExplanationContent | null, errorCode: string | null) => {
    await sql`
      update public.result_explanations
      set status = ${status}, content = ${content ? sql.json(content as never) : null}, error_code = ${errorCode},
          lease_until = null, updated_at = now()
      where id = ${jobId} and status = 'pending'
    `;
  };

  const allowed = await consumeRateLimits([{ bucket: "ai:global", limit: Number(process.env.AI_HOURLY_LIMIT ?? 300), windowSeconds: 3600 }]);
  if (!allowed) {
    await finish("fallback", null, "busy");
    return { status: "fallback", view: template(ctx), retryable: false };
  }

  try {
    const raw = await caller(buildAiPayload(ctx), cfg.model);
    const result = validateAiOutput(raw, ctx);
    if (!result.ok) {
      await finish("fallback", null, result.code);
      return { status: "fallback", view: template(ctx), retryable: false };
    }
    await finish("success", result.content, null);
    return { status: "success", view: { source: "ai", content: result.content } };
  } catch (err) {
    const code = classifyAiError(err);
    // Hanya kode error yang dicatat; tidak ada payload, nama, atau secret.
    console.warn(`[penjelasan] fallback: ${code}`);
    await finish("fallback", null, code);
    return { status: "fallback", view: template(ctx), retryable: false };
  }
}
