import { CATEGORIES, CATEGORY_IDS, type CategoryId, type ExplorationStatusId, EXPLORATION_STATUSES } from "@/config/questionnaire";
import { highestWithTies, intensityFromRaw, scoresFromRecord } from "@/lib/scoring";

export interface StatRow {
  classId: string;
  scores: Record<string, number>; // raw 3–15 per kategori
  explorationStatus: ExplorationStatusId;
  otherInterest: string | null;
}

export const UNDIFFERENTIATED = "belum_terbedakan" as const;

export interface DistributionItem {
  id: CategoryId | typeof UNDIFFERENTIATED;
  weight: number; // jumlah respons berbobot
  percent: number; // 0–100, tidak dibulatkan
}

/** Rata-rata intensitas minat (0–100) per kategori. Tanpa data → 0 untuk semua kategori. */
export function averageIntensity(rows: StatRow[]): Record<CategoryId, number> {
  const out = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0])) as Record<CategoryId, number>;
  if (rows.length === 0) return out;
  for (const id of CATEGORY_IDS) {
    const sum = rows.reduce((s, r) => s + intensityFromRaw(Number(r.scores[id])), 0);
    out[id] = sum / rows.length;
  }
  return out;
}

/**
 * Distribusi minat utama: pemenang tunggal = 1; k kategori seri tertinggi = 1/k
 * masing-masing; semua kategori sama = "Belum terbedakan". Denominator = semua
 * respons tersaring, sehingga total 100% (sebelum pembulatan) bila ada data.
 */
export function primaryDistribution(rows: StatRow[]): { total: number; items: DistributionItem[] } {
  const weights = new Map<DistributionItem["id"], number>();
  for (const id of CATEGORY_IDS) weights.set(id, 0);
  weights.set(UNDIFFERENTIATED, 0);

  for (const r of rows) {
    const cats = scoresFromRecord(r.scores);
    const allEqual = cats.every((c) => c.raw === cats[0].raw);
    if (allEqual) {
      weights.set(UNDIFFERENTIATED, weights.get(UNDIFFERENTIATED)! + 1);
      continue;
    }
    const top = highestWithTies(cats);
    for (const id of top) weights.set(id, weights.get(id)! + 1 / top.length);
  }

  const total = rows.length;
  const items: DistributionItem[] = [...weights.entries()].map(([id, weight]) => ({
    id,
    weight,
    percent: total === 0 ? 0 : (weight / total) * 100,
  }));
  return { total, items };
}

export function explorationSummary(rows: StatRow[]) {
  return EXPLORATION_STATUSES.map((s) => ({
    id: s.id,
    label: s.label,
    count: rows.filter((r) => r.explorationStatus === s.id).length,
  }));
}

export function otherInterestCount(rows: StatRow[]): number {
  return rows.filter((r) => r.otherInterest && r.otherInterest.trim().length > 0).length;
}

export function perClassAverages(rows: StatRow[], classes: { id: string; label: string }[]) {
  return classes
    .map((c) => {
      const subset = rows.filter((r) => r.classId === c.id);
      return { classId: c.id, label: c.label, count: subset.length, averages: averageIntensity(subset) };
    })
    .filter((c) => c.count > 0);
}

export function categoryLabel(id: string): string {
  if (id === UNDIFFERENTIATED) return "Belum terbedakan";
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
