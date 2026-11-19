import { describe, expect, it } from "vitest";
import { averageIntensity, explorationSummary, otherInterestCount, perClassAverages, primaryDistribution, UNDIFFERENTIATED, type StatRow } from "@/lib/stats";
import { CATEGORY_IDS } from "@/config/questionnaire";

const scores = (m: Partial<Record<string, number>>, base = 9) =>
  Object.fromEntries(CATEGORY_IDS.map((id) => [id, m[id] ?? base]));

const row = (s: Record<string, number>, classId = "A", status: StatRow["explorationStatus"] = "mulai_gambaran", other: string | null = null): StatRow =>
  ({ classId, scores: s, explorationStatus: status, otherInterest: other });

describe("distribusi minat utama", () => {
  it("kelompok kosong: semua 0, tanpa NaN", () => {
    const d = primaryDistribution([]);
    expect(d.total).toBe(0);
    expect(d.items.every((i) => i.percent === 0 && i.weight === 0)).toBe(true);
    expect(Object.values(averageIntensity([])).every((v) => v === 0)).toBe(true);
  });

  it("pemenang tunggal = 1, seri k = 1/k, semua sama = Belum terbedakan; total 100%", () => {
    const rows = [
      row(scores({ desain: 15 })),
      row(scores({ website: 14, game: 14 })),
      row(scores({ qa: 12, konten: 12, marketing: 12 })),
      row(scores({}, 9)), // semua sama
    ];
    const d = primaryDistribution(rows);
    const w = Object.fromEntries(d.items.map((i) => [i.id, i.weight]));
    expect(w.desain).toBe(1);
    expect(w.website).toBe(0.5);
    expect(w.game).toBe(0.5);
    expect(w.qa).toBeCloseTo(1 / 3);
    expect(w[UNDIFFERENTIATED]).toBe(1);
    expect(d.total).toBe(4);
    const sum = d.items.reduce((s, i) => s + i.percent, 0);
    expect(sum).toBeCloseTo(100, 10);
    expect(d.items.find((i) => i.id === "desain")!.percent).toBe(25);
  });

  it("status eksplorasi 'belum tahu' tidak dicampur dengan Belum terbedakan", () => {
    const d = primaryDistribution([row(scores({ desain: 15 }), "A", "belum_tahu")]);
    expect(d.items.find((i) => i.id === UNDIFFERENTIATED)!.weight).toBe(0);
  });
});

describe("rata-rata, per kelas, penanda", () => {
  const rows = [
    row(scores({ desain: 15 }, 3), "A", "belum_tahu", "Arsitek"),
    row(scores({ desain: 3 }, 3), "A", "beberapa_bidang", "  "),
    row(scores({ desain: 9 }, 9), "B", "belum_tahu", null),
  ];
  it("rata-rata intensitas", () => {
    expect(averageIntensity(rows).desain).toBeCloseTo((100 + 0 + 50) / 3);
  });
  it("per kelas dengan jumlah responden; kelas tanpa respons tidak ditampilkan", () => {
    const pc = perClassAverages(rows, [{ id: "A", label: "A" }, { id: "B", label: "B" }, { id: "C", label: "C" }]);
    expect(pc.map((p) => [p.classId, p.count])).toEqual([["A", 2], ["B", 1]]);
    expect(pc[0].averages.desain).toBe(50);
  });
  it("hitungan status dan isian lainnya (spasi saja tidak dihitung)", () => {
    expect(explorationSummary(rows).find((e) => e.id === "belum_tahu")!.count).toBe(2);
    expect(otherInterestCount(rows)).toBe(1);
  });
});
