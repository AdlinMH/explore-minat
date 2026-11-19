import { z } from "zod";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@/config/questionnaire";

export const PROMPT_VERSION = "p1-2026-11";

export const ALL_PROFESSION_IDS = CATEGORIES.flatMap((c) => c.professions.map((p) => p.id));

export interface ExplanationContent {
  ringkasan: string;
  alasan: { category_id: CategoryId; teks: string }[];
  profesi: { category_id: CategoryId; profession_id: string; alasan: string }[];
  aktivitas_coba: string;
}

export type ExplanationSource = "ai" | "template";

export interface ExplanationView {
  source: ExplanationSource;
  content: ExplanationContent;
}

/** JSON Schema untuk Structured Outputs (strict). Panjang & referensi divalidasi ulang dengan Zod. */
export const OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ringkasan", "alasan", "profesi", "aktivitas_coba"],
  properties: {
    ringkasan: { type: "string", description: "2–3 kalimat ringkas tentang pola ketertarikan saat ini." },
    alasan: {
      type: "array",
      description: "Satu alasan per kategori rekomendasi, berdasarkan aktivitas yang diberi skor tinggi.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category_id", "teks"],
        properties: {
          category_id: { type: "string", enum: CATEGORY_IDS },
          teks: { type: "string" },
        },
      },
    },
    profesi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category_id", "profession_id", "alasan"],
        properties: {
          category_id: { type: "string", enum: CATEGORY_IDS },
          profession_id: { type: "string", enum: ALL_PROFESSION_IDS },
          alasan: { type: "string" },
        },
      },
    },
    aktivitas_coba: { type: "string", description: "Satu aktivitas kecil yang bisa dicoba minggu ini." },
  },
} as const;

const categoryEnum = z.enum(CATEGORY_IDS as [CategoryId, ...CategoryId[]]);

export const outputSchema = z.object({
  ringkasan: z.string().trim().min(20).max(600),
  alasan: z.array(z.object({ category_id: categoryEnum, teks: z.string().trim().min(10).max(320) })).max(8),
  profesi: z
    .array(z.object({ category_id: categoryEnum, profession_id: z.string(), alasan: z.string().trim().min(5).max(220) }))
    .max(8),
  aktivitas_coba: z.string().trim().min(10).max(320),
});
