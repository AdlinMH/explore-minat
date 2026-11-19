import { describe, expect, it } from "vitest";
import { CATEGORIES, QUESTIONS } from "@/config/questionnaire";
import { AnswerValidationError, computeScores, formatScore, validateAnswers } from "@/lib/scoring";
import { answersByCategory, uniformAnswers } from "../helpers";

describe("mapping pertanyaan", () => {
  it("24 pertanyaan, 8 kategori × 3, sesuai tabel spesifikasi", () => {
    expect(QUESTIONS).toHaveLength(24);
    const expected: Record<string, number[]> = {
      desain: [1, 9, 17], website: [2, 10, 18], mobile: [3, 11, 19], game: [4, 12, 20],
      ai_data: [5, 13, 21], qa: [6, 14, 22], konten: [7, 15, 23], marketing: [8, 16, 24],
    };
    for (const c of CATEGORIES) expect([...c.questionNumbers]).toEqual(expected[c.id]);
    const all = CATEGORIES.flatMap((c) => c.questionNumbers).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    for (const q of QUESTIONS) expect(expected[q.category]).toContain(q.number);
  });
});

describe("rumus intensitas", () => {
  it("semua 1 → 0%, semua 5 → 100%, semua 3 → 50%", () => {
    expect(computeScores(uniformAnswers(1)).categories.every((c) => c.intensity === 0)).toBe(true);
    expect(computeScores(uniformAnswers(5)).categories.every((c) => c.intensity === 100)).toBe(true);
    expect(computeScores(uniformAnswers(3)).categories.every((c) => c.intensity === 50)).toBe(true);
  });
  it("menghitung skor mentah 3–15 dan satu desimal untuk tampilan", () => {
    const a = uniformAnswers(3);
    a.q01 = 5; a.q09 = 4; a.q17 = 5; // desain = 14 → 91,666…
    const r = computeScores(a);
    const d = r.categories.find((c) => c.id === "desain")!;
    expect(d.raw).toBe(14);
    expect(formatScore(d.intensity)).toBe("91,7");
    expect(formatScore(50)).toBe("50");
  });
});

describe("pola khusus", () => {
  it("semua 1: tidak ada favorit", () => {
    const r = computeScores(uniformAnswers(1));
    expect(r.pattern).toBe("all_min");
    expect(r.topGroup).toEqual([]);
    expect(r.highest).toEqual([]);
  });
  it("semua 5: tersebar luas", () => {
    expect(computeScores(uniformAnswers(5)).pattern).toBe("all_max");
  });
  it("semua kategori sama tetapi jawaban berbeda: all_equal", () => {
    const a = uniformAnswers(3);
    // setiap kategori: 2+3+4 = 9
    for (const c of CATEGORIES) {
      const [x, y] = c.questionNumbers;
      a[`q${String(x).padStart(2, "0")}`] = 2;
      a[`q${String(y).padStart(2, "0")}`] = 4;
    }
    const r = computeScores(a);
    expect(r.pattern).toBe("all_equal");
    expect(r.topGroup).toEqual([]);
  });
  it("semua 3 juga belum terbedakan", () => {
    expect(computeScores(uniformAnswers(3)).pattern).toBe("all_equal");
  });
});

describe("peringkat dan seri", () => {
  it("top 3 tanpa seri", () => {
    const r = computeScores(answersByCategory({ game: 5, website: 4, qa: 2 }, 3));
    // game 15, website 12, lainnya 9 (6 kategori seri di peringkat 3) → semua seri ikut
    expect(r.topGroup.slice(0, 2)).toEqual(["game", "website"]);
    expect(r.topGroup).toHaveLength(2 + 5);
    expect(r.topGroup).not.toContain("qa");
    expect(r.highest).toEqual(["game"]);
  });
  it("seri di batas peringkat 3 menyertakan seluruh kategori seri", () => {
    const r = computeScores(answersByCategory({ desain: 5, website: 5, mobile: 4, game: 4, ai_data: 4 }, 1));
    expect(r.topGroup).toEqual(["desain", "website", "mobile", "game", "ai_data"]);
    expect(r.highest).toEqual(["desain", "website"]);
  });
  it("seri di peringkat 1 dengan 4 kategori tetap semua masuk", () => {
    const r = computeScores(answersByCategory({ desain: 5, qa: 5, konten: 5, marketing: 5 }, 2));
    expect(r.topGroup.sort()).toEqual(["desain", "konten", "marketing", "qa"]);
    expect(r.highest).toHaveLength(4);
  });
  it("hasil tidak bergantung pada urutan kunci input", () => {
    const a = answersByCategory({ mobile: 5, ai_data: 4 }, 2);
    const reversed = Object.fromEntries(Object.entries(a).reverse());
    expect(computeScores(reversed)).toEqual(computeScores(a));
  });
});

describe("validasi jawaban", () => {
  it("menolak jawaban tidak lengkap", () => {
    const a = uniformAnswers(3);
    delete a.q24;
    expect(() => validateAnswers(a)).toThrow(AnswerValidationError);
  });
  it.each([0, 6, 2.5, "3", null, -1])("menolak nilai di luar skala: %s", (v) => {
    const a: Record<string, unknown> = uniformAnswers(3);
    a.q05 = v;
    expect(() => validateAnswers(a)).toThrow(AnswerValidationError);
  });
  it("menolak ID pertanyaan tambahan atau skor kiriman klien", () => {
    expect(() => validateAnswers({ ...uniformAnswers(3), skor_desain: 100 })).toThrow(AnswerValidationError);
    expect(() => validateAnswers([1, 2, 3])).toThrow(AnswerValidationError);
  });
});
