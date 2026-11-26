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
  /** Jumlah jawaban "Sangat tertarik" (5) di bidang ini; 0 jika tidak diketahui. */
  strong?: number;
  /** Jumlah jawaban 4 atau 5 di bidang ini; 0 jika tidak diketahui. */
  liked?: number;
}

/** Alasan bidang utama terpilih otomatis saat skornya sama dengan bidang lain. */
export type AutoTieBreak = "minat_lainnya" | "sangat_tertarik" | "tertarik";

export interface ScoreResult {
  categories: CategoryScore[];
  /**
   * Kategori peringkat 1–3 (termasuk yang seri di batas) yang skornya di atas
   * rata-rata skor siswa itu sendiri. Kosong jika minat belum terbedakan.
   */
  topGroup: CategoryId[];
  /** Kategori dengan skor tertinggi (bisa lebih dari satu jika seri dan belum dipilih siswa). */
  highest: CategoryId[];
  /** Bidang dengan skor tertinggi yang sama, sebelum pemecah seri apa pun. */
  tiedByScore: CategoryId[];
  /**
   * Bidang yang masih seri setelah pemecah seri otomatis; jika lebih dari satu,
   * siswa ditanya lewat pertanyaan penentu.
   */
  tiedHighest: CategoryId[];
  /** Diisi jika seri skor dipecah otomatis. */
  autoTieBreak: AutoTieBreak | null;
  /** Rata-rata skor mentah (3–15) semua kategori milik siswa ini. */
  average: number;
  /** Selisih skor mentah tertinggi dan terendah; kecil berarti profil merata. */
  spread: number;
  pattern: ResultPattern;
}

/** Selisih skor mentah maksimal yang masih dianggap profil merata. */
export const FLAT_SPREAD_MAX = 2;

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

/**
 * Menghitung skor dari 24 jawaban.
 *
 * Jika beberapa bidang seri di skor tertinggi, pemecah seri otomatis dipakai
 * berurutan: (1) bidang yang disebut siswa di "minat lainnya" (`mentioned`),
 * (2) jumlah jawaban "Sangat tertarik", (3) jumlah jawaban 4–5. Jika masih seri,
 * `tieBreak` (pilihan siswa di pertanyaan penentu) dipakai; nilai itu diabaikan
 * jika bidangnya tidak termasuk yang masih seri.
 */
export function computeScores(
  answers: Answers,
  tieBreak?: CategoryId | null,
  mentioned: readonly CategoryId[] = [],
): ScoreResult {
  const validated = validateAnswers(answers);
  const categories: CategoryScore[] = CATEGORIES.map((c) => {
    const values = c.questionNumbers.map((n) => validated[`q${String(n).padStart(2, "0")}`]);
    const raw = values.reduce((sum, v) => sum + v, 0);
    return {
      id: c.id,
      raw,
      intensity: intensityFromRaw(raw),
      strong: values.filter((v) => v === SCALE_MAX).length,
      liked: values.filter((v) => v >= 4).length,
    };
  });

  const values = Object.values(validated);
  const allSameCategory = categories.every((c) => c.raw === categories[0].raw);
  let pattern: ResultPattern = "normal";
  if (values.every((v) => v === SCALE_MIN)) pattern = "all_min";
  else if (values.every((v) => v === SCALE_MAX)) pattern = "all_max";
  else if (allSameCategory) pattern = "all_equal";

  const raws = categories.map((c) => c.raw);
  const average = raws.reduce((a, b) => a + b, 0) / raws.length;
  const spread = Math.max(...raws) - Math.min(...raws);

  if (pattern !== "normal") {
    return { categories, topGroup: [], highest: [], tiedByScore: [], tiedHighest: [], autoTieBreak: null, average, spread, pattern };
  }

  // Urutan: skor, lalu pemecah seri otomatis, lalu urutan konfigurasi (hanya tampilan).
  const mentionedSet = new Set(mentioned);
  const keys: { name: AutoTieBreak; of: (c: CategoryScore) => number }[] = [
    { name: "minat_lainnya", of: (c) => (mentionedSet.has(c.id) ? 1 : 0) },
    { name: "sangat_tertarik", of: (c) => c.strong ?? 0 },
    { name: "tertarik", of: (c) => c.liked ?? 0 },
  ];
  const order = new Map(CATEGORY_IDS.map((id, i) => [id, i]));
  const ranked = [...categories].sort((a, b) => {
    if (b.raw !== a.raw) return b.raw - a.raw;
    for (const k of keys) if (k.of(b) !== k.of(a)) return k.of(b) - k.of(a);
    return order.get(a.id)! - order.get(b.id)!;
  });

  const tiedByScore = highestWithTies(categories);
  let tied = ranked.filter((c) => tiedByScore.includes(c.id));
  let autoTieBreak: AutoTieBreak | null = null;
  for (const k of keys) {
    if (tied.length < 2) break;
    const best = Math.max(...tied.map(k.of));
    const next = tied.filter((c) => k.of(c) === best);
    if (next.length < tied.length) autoTieBreak = k.name;
    tied = next;
  }
  const tiedHighest = tied.map((c) => c.id);
  let highest = tiedHighest;
  if (tieBreak && tiedHighest.length > 1 && tiedHighest.includes(tieBreak)) highest = [tieBreak];

  // Skor relatif: hanya bidang di atas rata-rata siswa sendiri yang dianggap menonjol.
  const aboveAverage = new Set(categories.filter((c) => c.raw > average).map((c) => c.id));
  const inTop = new Set(topGroupWithTies(categories, 3).filter((id) => aboveAverage.has(id)));
  const rankedTop = ranked.filter((c) => inTop.has(c.id)).map((c) => c.id);
  const topGroup = [...highest.filter((id) => inTop.has(id)), ...rankedTop.filter((id) => !highest.includes(id))];

  return { categories, topGroup, highest, tiedByScore, tiedHighest, autoTieBreak, average, spread, pattern };
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
