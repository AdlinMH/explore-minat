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
  it("hanya bidang di atas rata-rata siswa sendiri yang masuk peringkat", () => {
    const r = computeScores(answersByCategory({ game: 5, website: 4, qa: 2 }, 3));
    // game 15, website 12, qa 6, lainnya 9; rata-rata 9,75 → bidang bernilai 9 tidak dianggap menonjol
    expect(r.average).toBeCloseTo(9.75);
    expect(r.topGroup).toEqual(["game", "website"]);
    expect(r.highest).toEqual(["game"]);
    expect(r.tiedHighest).toEqual(["game"]);
    expect(r.spread).toBe(9);
  });
  it("profil merata: selisih kecil tetap normal, spread tercatat", () => {
    const a = { ...uniformAnswers(4), q07: 5 }; // video 13, lainnya 12
    const r = computeScores(a);
    expect(r.pattern).toBe("normal");
    expect(r.highest).toEqual(["konten"]);
    expect(r.topGroup).toEqual(["konten"]);
    expect(r.spread).toBe(1);
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
  it("pertanyaan penentu memilih satu bidang dari yang seri tertinggi", () => {
    const a = answersByCategory({ desain: 5, konten: 5, marketing: 4 }, 2);
    const tanpa = computeScores(a);
    expect(tanpa.highest).toEqual(["desain", "konten"]);
    const dengan = computeScores(a, "konten");
    expect(dengan.highest).toEqual(["konten"]);
    expect(dengan.tiedHighest).toEqual(["desain", "konten"]);
    expect(dengan.topGroup[0]).toBe("konten");
    expect(dengan.topGroup).toContain("desain");
    expect(dengan.categories).toEqual(tanpa.categories); // skor tidak berubah
  });
  it("pilihan penentu di luar bidang yang seri diabaikan", () => {
    const a = answersByCategory({ desain: 5, konten: 5 }, 2);
    expect(computeScores(a, "qa").highest).toEqual(["desain", "konten"]);
    const satu = answersByCategory({ game: 5 }, 2);
    expect(computeScores(satu, "website").highest).toEqual(["game"]);
  });
  it("hasil tidak bergantung pada urutan kunci input", () => {
    const a = answersByCategory({ mobile: 5, ai_data: 4 }, 2);
    const reversed = Object.fromEntries(Object.entries(a).reverse());
    expect(computeScores(reversed)).toEqual(computeScores(a));
  });
});

describe("pemecah seri otomatis", () => {
  // desain: 5,5,2 (=12, dua "Sangat tertarik"); konten: 4,4,4 (=12, nol "Sangat tertarik")
  const seri = () => ({ ...answersByCategory({}, 2), q01: 5, q09: 5, q17: 2, q07: 4, q15: 4, q23: 4 });

  it("seri skor dipecah dengan jumlah jawaban Sangat tertarik", () => {
    const r = computeScores(seri());
    expect(r.tiedByScore).toEqual(["desain", "konten"]);
    expect(r.highest).toEqual(["desain"]);
    expect(r.tiedHighest).toEqual(["desain"]);
    expect(r.autoTieBreak).toBe("sangat_tertarik");
    expect(r.topGroup).toEqual(["desain", "konten"]);
  });
  it("bidang yang disebut di minat lainnya didahulukan", () => {
    const r = computeScores(seri(), null, ["konten"]);
    expect(r.highest).toEqual(["konten"]);
    expect(r.autoTieBreak).toBe("minat_lainnya");
    expect(r.topGroup).toEqual(["konten", "desain"]);
  });
  it("jumlah jawaban 4–5 dipakai jika Sangat tertarik sama", () => {
    // desain: 5,4,3 (=12, liked 2); konten: 5,5,2 → beda strong; pakai website: 5,3,4 (=12, strong 1, liked 2)
    const a = { ...answersByCategory({}, 2), q01: 5, q09: 4, q17: 3, q02: 5, q10: 5, q18: 2 };
    // desain 12 (strong 1, liked 2), website 12 (strong 2) → website menang lewat sangat_tertarik
    expect(computeScores(a).highest).toEqual(["website"]);
    const b = { ...answersByCategory({}, 2), q01: 5, q09: 4, q17: 3, q02: 5, q10: 2, q18: 5 };
    // desain 12 (strong 1, liked 2), website 12 (strong 2, liked 2) → website
    expect(computeScores(b).highest).toEqual(["website"]);
    const c = { ...answersByCategory({}, 2), q01: 5, q09: 4, q17: 3, q02: 5, q10: 3, q18: 4 };
    // keduanya strong 1, liked 2 → masih seri, siswa ditanya
    const rc = computeScores(c);
    expect(rc.tiedHighest).toEqual(["desain", "website"]);
    expect(rc.highest).toEqual(["desain", "website"]);
    const d = { ...answersByCategory({}, 1), q01: 5, q09: 4, q17: 3, q02: 5, q10: 5, q18: 2, q03: 4, q11: 4, q19: 4 };
    // desain 12 (s1,l2), website 12 (s2), mobile 12 (s0,l3)
    expect(computeScores(d).highest).toEqual(["website"]);
    const e = { ...answersByCategory({}, 1), q01: 5, q09: 4, q17: 3, q03: 4, q11: 4, q19: 4 };
    // desain 12 (s1,l2) vs mobile 12 (s0,l3): sangat_tertarik menang lebih dulu
    expect(computeScores(e).highest).toEqual(["desain"]);
    const f = { ...answersByCategory({}, 1), q01: 4, q09: 4, q17: 4, q03: 4, q11: 4, q19: 4, q05: 4, q13: 4, q21: 3 };
    // desain 12 (l3), mobile 12 (l3), ai_data 11 → masih seri
    expect(computeScores(f).tiedHighest).toEqual(["desain", "mobile"]);
  });
  it("pemecah seri liked bekerja jika strong sama", () => {
    const a = { ...answersByCategory({}, 1), q01: 5, q09: 4, q17: 2, q02: 5, q10: 3, q18: 3 };
    // desain 11 (s1,l2), website 11 (s1,l1)
    const r = computeScores(a);
    expect(r.highest).toEqual(["desain"]);
    expect(r.autoTieBreak).toBe("tertarik");
  });
  it("pilihan siswa dipakai hanya jika masih seri setelah pemecah otomatis", () => {
    expect(computeScores(seri(), "konten").highest).toEqual(["desain"]);
    const sama = answersByCategory({ desain: 5, konten: 5 }, 2);
    expect(computeScores(sama, "konten").highest).toEqual(["konten"]);
  });
  it("skor tidak berubah oleh pemecah seri", () => {
    expect(computeScores(seri(), null, ["konten"]).categories).toEqual(computeScores(seri()).categories);
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
