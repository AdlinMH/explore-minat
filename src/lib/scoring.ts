import {
  CATEGORIES,
  CATEGORY_IDS,
  QUESTION_IDS,
  SCALE_MAX,
  SCALE_MIN,
  type CategoryId,
} from "@/config/questionnaire";

export type Answers = Record<string, number>;

/**
 * - normal: ada perbedaan skor antar kategori.
 * - all_equal: semua kategori sama, bukan semua minimum/maksimum.
 * - all_min: semua jawaban 1.
 * - all_max: semua jawaban 5.
 */
export type ResultPattern = "normal" | "all_equal" | "all_min" | "all_max";

export interface CategoryScore {
  id: CategoryId;
  raw: number; // 3–15
  intensity: number; // 0–100, tidak dibulatkan
}

export interface ScoreResult {
  categories: CategoryScore[];
  /** Kategori peringkat 1–3, termasuk seluruh kategori seri di batas peringkat. Kosong jika minat belum terbedakan. */
  topGroup: CategoryId[];
  /** Kategori dengan skor tertinggi (bisa lebih dari satu jika seri). Kosong jika belum terbedakan. */
  highest: CategoryId[];
  pattern: ResultPattern;
}

export class AnswerValidationError extends Error {}

/** Memastikan tepat 24 jawaban bilangan bulat 1–5 dengan ID pertanyaan yang dikenal. */
export function validateAnswers(input: unknown): Answers {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AnswerValidationError("Format jawaban tidak valid.");
  }
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  const known = new Set<string>(QUESTION_IDS);
  for (const k of keys) {
    if (!known.has(k)) throw new AnswerValidationError("Ada pertanyaan yang tidak dikenal.");
  }
  const out: Answers = {};
  for (const id of QUESTION_IDS) {
    const v = obj[id];
    if (v === undefined || v === null) throw new AnswerValidationError("Masih ada pertanyaan yang belum dijawab.");
    if (typeof v !== "number" || !Number.isInteger(v) || v < SCALE_MIN || v > SCALE_MAX) {
      throw new AnswerValidationError("Nilai jawaban harus 1 sampai 5.");
    }
    out[id] = v;
  }
  return out;
}

export function intensityFromRaw(raw: number): number {
  return ((raw - 3) / 12) * 100;
}

export function roundOne(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Skor minat untuk tampilan siswa, mis. "85/100" → dibulatkan satu desimal. */
export function formatScore(intensity: number): string {
  const r = roundOne(intensity);
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

export function computeScores(answers: Answers): ScoreResult {
  const validated = validateAnswers(answers);
  const categories: CategoryScore[] = CATEGORIES.map((c) => {
    const raw = c.questionNumbers.reduce(
      (sum, n) => sum + validated[`q${String(n).padStart(2, "0")}`],
      0,
    );
    return { id: c.id, raw, intensity: intensityFromRaw(raw) };
  });

  const values = Object.values(validated);
  const allSameCategory = categories.every((c) => c.raw === categories[0].raw);
  let pattern: ResultPattern = "normal";
  if (values.every((v) => v === SCALE_MIN)) pattern = "all_min";
  else if (values.every((v) => v === SCALE_MAX)) pattern = "all_max";
  else if (allSameCategory) pattern = "all_equal";

  if (pattern !== "normal") {
    return { categories, topGroup: [], highest: [], pattern };
  }

  return {
    categories,
    topGroup: topGroupWithTies(categories, 3),
    highest: highestWithTies(categories),
    pattern,
  };
}

/**
 * Mengambil kategori dengan peringkat kompetisi ≤ limit (1,2,2,4 …), sehingga
 * semua kategori yang seri di batas ikut masuk. Urutan hasil: skor menurun,
 * lalu urutan konfigurasi hanya untuk tampilan (tidak memilih pemenang).
 */
export function topGroupWithTies(categories: CategoryScore[], limit: number): CategoryId[] {
  const sorted = sortByScore(categories);
  if (sorted.length <= limit) return sorted.map((c) => c.id);
  const cutoff = sorted[limit - 1].raw;
  return sorted.filter((c) => c.raw >= cutoff).map((c) => c.id);
}

export function highestWithTies(categories: CategoryScore[]): CategoryId[] {
  const max = Math.max(...categories.map((c) => c.raw));
  return sortByScore(categories)
    .filter((c) => c.raw === max)
    .map((c) => c.id);
}

export function sortByScore(categories: CategoryScore[]): CategoryScore[] {
  const order = new Map(CATEGORY_IDS.map((id, i) => [id, i]));
  return [...categories].sort((a, b) => b.raw - a.raw || order.get(a.id)! - order.get(b.id)!);
}

/** Bentuk yang disimpan di kolom responses.scores. */
export function scoresToRecord(result: ScoreResult): Record<CategoryId, number> {
  return Object.fromEntries(result.categories.map((c) => [c.id, c.raw])) as Record<CategoryId, number>;
}

export function scoresFromRecord(record: Record<string, number>): CategoryScore[] {
  return CATEGORIES.map((c) => {
    const raw = Number(record[c.id]);
    return { id: c.id, raw, intensity: intensityFromRaw(raw) };
  });
}
