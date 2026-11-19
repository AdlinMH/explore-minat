import "server-only";
import OpenAI from "openai";
import { OUTPUT_JSON_SCHEMA } from "@/lib/explanation/types";
import { SYSTEM_INSTRUCTIONS } from "@/lib/explanation/payload";

export interface AiConfig {
  enabled: boolean;
  model: string;
}

export function aiConfig(): AiConfig {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  return { enabled: Boolean(key && model), model: model || "template" };
}

export type AiErrorCode =
  | "no_key"
  | "auth"
  | "quota"
  | "rate_limit"
  | "timeout"
  | "connection"
  | "bad_request"
  | "server_error"
  | "incomplete"
  | "invalid_json"
  | "unknown";

export class AiCallError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

/** Fungsi pemanggil model; dapat diganti mock dalam pengujian. */
export type AiCaller = (payload: unknown, model: string) => Promise<unknown>;

const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20000);

export function classifyAiError(err: unknown): AiErrorCode {
  if (err instanceof AiCallError) return err.code;
  if (err instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (err instanceof OpenAI.APIConnectionError) return "connection";
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) return "auth";
  if (err instanceof OpenAI.RateLimitError) {
    const code = (err as { code?: string | null }).code;
    return code === "insufficient_quota" ? "quota" : "rate_limit";
  }
  if (err instanceof OpenAI.BadRequestError || err instanceof OpenAI.NotFoundError) return "bad_request";
  if (err instanceof OpenAI.InternalServerError) return "server_error";
  return "unknown";
}

export const openAiCaller: AiCaller = async (payload, model) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AiCallError("no_key");
  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim();
  const response = await client.responses.create({
    model,
    instructions: SYSTEM_INSTRUCTIONS,
    input: JSON.stringify(payload),
    max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 4000),
    store: false,
    ...(effort ? { reasoning: { effort: effort as "low" } } : {}),
    text: {
      format: { type: "json_schema", name: "penjelasan_hasil", strict: true, schema: OUTPUT_JSON_SCHEMA as unknown as Record<string, unknown> },
    },
  });
  if (response.status && response.status !== "completed") throw new AiCallError("incomplete");
  try {
    return JSON.parse(response.output_text);
  } catch {
    throw new AiCallError("invalid_json");
  }
};
