import { QUESTION_IDS } from "@/config/questionnaire";

export function uniformAnswers(v: number): Record<string, number> {
  return Object.fromEntries(QUESTION_IDS.map((id) => [id, v]));
}

/** Atur skor per kategori dengan 3 jawaban sama per kategori. */
export function answersByCategory(map: Partial<Record<string, number>>, base = 3) {
  const a = uniformAnswers(base);
  const groups: Record<string, number[]> = {
    desain: [1, 9, 17], website: [2, 10, 18], mobile: [3, 11, 19], game: [4, 12, 20],
    ai_data: [5, 13, 21], qa: [6, 14, 22], konten: [7, 15, 23], marketing: [8, 16, 24],
  };
  for (const [cat, v] of Object.entries(map)) for (const n of groups[cat]) a[`q${String(n).padStart(2, "0")}`] = v!;
  return a;
}
