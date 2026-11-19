import { CATEGORY_BY_ID, type CategoryId } from "@/config/questionnaire";
import type { ExplanationContext } from "@/lib/explanation/payload";
import { outputSchema, type ExplanationContent } from "@/lib/explanation/types";

const BANNED = /(mbti|kepribadian|berbakat|\bbakat\b|pasti cocok|dijamin|menjamin|akurat|\biq\b|introvert|ekstrovert|<[a-z/!])/i;

export type ValidationOutcome = { ok: true; content: ExplanationContent } | { ok: false; code: string };

/** Memastikan keluaran model sesuai schema, panjang, katalog, dan rekomendasi server. */
export function validateAiOutput(raw: unknown, ctx: ExplanationContext): ValidationOutcome {
  const parsed = outputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_schema" };
  const out = parsed.data;
  const allowed = new Set<CategoryId>(ctx.topGroup);
  const neutral = ctx.pattern !== "normal" || ctx.topGroup.length === 0;

  if (neutral && (out.alasan.length > 0 || out.profesi.length > 0)) return { ok: false, code: "unexpected_categories" };
  for (const a of out.alasan) if (!allowed.has(a.category_id)) return { ok: false, code: "category_not_recommended" };
  for (const p of out.profesi) {
    if (!allowed.has(p.category_id)) return { ok: false, code: "category_not_recommended" };
    if (!CATEGORY_BY_ID[p.category_id].professions.some((x) => x.id === p.profession_id)) {
      return { ok: false, code: "unknown_profession" };
    }
  }
  if (!neutral) {
    const covered = new Set(out.alasan.map((a) => a.category_id));
    if (covered.size !== allowed.size) return { ok: false, code: "missing_reason" };
  }
  const texts = [out.ringkasan, out.aktivitas_coba, ...out.alasan.map((a) => a.teks), ...out.profesi.map((p) => p.alasan)];
  if (texts.some((t) => BANNED.test(t))) return { ok: false, code: "banned_claim" };

  // Urutan mengikuti peringkat server, bukan urutan dari model.
  const order = new Map(ctx.topGroup.map((id, i) => [id, i]));
  out.alasan.sort((a, b) => order.get(a.category_id)! - order.get(b.category_id)!);
  out.profesi.sort((a, b) => order.get(a.category_id)! - order.get(b.category_id)!);
  return { ok: true, content: out as ExplanationContent };
}
