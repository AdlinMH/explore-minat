import { CATEGORIES, EXPLORATION_LABEL, QUESTION_IDS, type ExplorationStatusId } from "@/config/questionnaire";
import { intensityFromRaw, roundOne } from "@/lib/scoring";
import { categoryLabel } from "@/lib/stats";

/** Baris mentah dari database untuk ekspor (lihat getExportRows). */
export type ExportSourceRow = {
  id: string;
  name: string;
  class_label: string;
  created_at: Date;
  questionnaire_version: string;
  answers: Record<string, number>;
  scores: Record<string, number>;
  highest_category_ids: string[];
  result_pattern: string;
  exploration_status: string;
  other_interest: string | null;
  reflection: string | null;
};

export type ExportValue = string | number | Date | null;

export const EXPORT_HEADER: readonly string[] = [
  "id", "nama", "kelas", "waktu_wib", "versi_kuesioner",
  ...CATEGORIES.map((c) => `minat_${c.id}`),
  "minat_tertinggi", "status_eksplorasi", "minat_lainnya", "refleksi",
  ...QUESTION_IDS,
];

/** Indeks kolom waktu di EXPORT_HEADER. */
export const EXPORT_TIME_COLUMN = 3;

/**
 * Satu baris ekspor dengan tipe asli: skor dan jawaban berupa angka,
 * waktu berupa Date (UTC). Format tampilan diserahkan ke CSV/XLSX.
 */
export function exportRow(r: ExportSourceRow): ExportValue[] {
  return [
    r.id, r.name, r.class_label, r.created_at, r.questionnaire_version,
    ...CATEGORIES.map((c) => roundOne(intensityFromRaw(r.scores[c.id]))),
    r.result_pattern === "normal" ? r.highest_category_ids.map(categoryLabel).join(" / ") : "Belum terbedakan",
    EXPLORATION_LABEL[r.exploration_status as ExplorationStatusId] ?? r.exploration_status,
    r.other_interest ?? "", r.reflection ?? "",
    ...QUESTION_IDS.map((q) => r.answers[q] ?? null),
  ];
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Excel tidak menyimpan zona waktu. Geser waktu ke WIB lalu baca sebagai UTC
 * agar sel menampilkan jam dinding WIB.
 */
export function toWibWallClock(d: Date): Date {
  return new Date(d.getTime() + WIB_OFFSET_MS);
}

export function exportFileStamp(now = new Date()): string {
  return toWibWallClock(now).toISOString().slice(0, 10);
}
