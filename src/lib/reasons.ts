import { QUESTIONS, SCALE, type CategoryId } from "@/config/questionnaire";

export interface Reason {
  questionId: string;
  text: string;
  value: number;
  label: string;
}

/**
 * Alasan sebuah bidang muncul: tiga pernyataan bidang itu beserta jawaban siswa,
 * diurutkan dari skor tertinggi (seri mengikuti nomor pertanyaan).
 */
export function categoryReasons(category: CategoryId, answers: Record<string, number>): Reason[] {
  return QUESTIONS.filter((q) => q.category === category && typeof answers[q.id] === "number")
    .sort((a, b) => answers[b.id] - answers[a.id] || a.number - b.number)
    .map((q) => ({
      questionId: q.id,
      text: q.text,
      value: answers[q.id],
      label: SCALE.find((s) => s.value === answers[q.id])?.label ?? String(answers[q.id]),
    }));
}
