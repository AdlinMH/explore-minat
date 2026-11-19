import { describe, expect, it } from "vitest";
import { buildAiPayload, type ExplanationContext } from "@/lib/explanation/payload";
import { templateExplanation } from "@/lib/explanation/template";
import { validateAiOutput } from "@/lib/explanation/validate";
import { computeScores, scoresToRecord } from "@/lib/scoring";
import { QUESTIONNAIRE_VERSION } from "@/config/questionnaire";
import { answersByCategory, uniformAnswers } from "../helpers";

function ctxFor(answers: Record<string, number>): ExplanationContext {
  const r = computeScores(answers);
  return { questionnaireVersion: QUESTIONNAIRE_VERSION, answers, scores: scoresToRecord(r), topGroup: r.topGroup, pattern: r.pattern, explorationStatus: "belum_tahu" };
}

const normal = ctxFor(answersByCategory({ game: 5, website: 4, desain: 4 }, 2));

const goodOutput = {
  ringkasan: "Kamu paling tertarik pada game, website, dan desain. Minatmu bisa berubah setelah mencoba.",
  alasan: [
    { category_id: "website", teks: "Kamu memberi skor 4 untuk membuat halaman website." },
    { category_id: "game", teks: "Kamu memberi skor 5 untuk membuat aturan game." },
    { category_id: "desain", teks: "Kamu memberi skor 4 untuk membuat poster." },
  ],
  profesi: [{ category_id: "game", profession_id: "game_designer", alasan: "Merancang aturan permainan." }],
  aktivitas_coba: "Rancang aturan game sederhana di kertas.",
};

describe("payload AI", () => {
  it("tidak memuat nama, kelas, ID respons, atau teks bebas", () => {
    const p = JSON.stringify(buildAiPayload(normal));
    for (const key of ["name", "nama_siswa", "class", "kelas", "response_id", "other_interest", "reflection", "refleksi"]) {
      expect(p).not.toContain(`"${key}"`);
    }
    expect(p).toContain("kategori_rekomendasi");
  });
});

describe("validasi keluaran AI", () => {
  it("menerima keluaran valid dan mengurutkan sesuai peringkat server", () => {
    const r = validateAiOutput(structuredClone(goodOutput), normal);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content.alasan.map((a) => a.category_id)).toEqual(normal.topGroup);
  });
  it("menolak schema salah", () => {
    expect(validateAiOutput({ ringkasan: 1 }, normal)).toEqual({ ok: false, code: "invalid_schema" });
    expect(validateAiOutput("bukan objek", normal).ok).toBe(false);
  });
  it("menolak ID profesi tidak dikenal / dari kategori lain", () => {
    const bad = { ...structuredClone(goodOutput), profesi: [{ category_id: "game", profession_id: "pilot", alasan: "Terbang tinggi." }] };
    expect(validateAiOutput(bad, normal)).toEqual({ ok: false, code: "unknown_profession" });
    const cross = { ...structuredClone(goodOutput), profesi: [{ category_id: "game", profession_id: "data_analyst", alasan: "Menganalisis data." }] };
    expect(validateAiOutput(cross, normal)).toEqual({ ok: false, code: "unknown_profession" });
  });
  it("menolak kategori di luar rekomendasi server", () => {
    const bad = structuredClone(goodOutput);
    bad.alasan.push({ category_id: "marketing", teks: "Kamu suka promosi juga sepertinya." });
    expect(validateAiOutput(bad, normal)).toEqual({ ok: false, code: "category_not_recommended" });
  });
  it("menolak klaim kepribadian/bakat", () => {
    const bad = { ...structuredClone(goodOutput), ringkasan: "Kepribadianmu kreatif dan kamu pasti cocok jadi game designer." };
    expect(validateAiOutput(bad, normal)).toEqual({ ok: false, code: "banned_claim" });
  });
  it("pola netral: kategori harus kosong", () => {
    const ctx = ctxFor(uniformAnswers(1));
    expect(validateAiOutput(goodOutput, ctx).ok).toBe(false);
    expect(validateAiOutput({ ...goodOutput, alasan: [], profesi: [] }, ctx).ok).toBe(true);
  });
  it("menolak teks terlalu panjang", () => {
    expect(validateAiOutput({ ...structuredClone(goodOutput), ringkasan: "a".repeat(601) }, normal).ok).toBe(false);
  });
});

describe("template fallback", () => {
  it("semua 1: tidak menyebut bidang favorit", () => {
    const t = templateExplanation(ctxFor(uniformAnswers(1)));
    expect(t.alasan).toEqual([]);
    expect(t.profesi).toEqual([]);
    expect(t.ringkasan).toMatch(/belum ada kegiatan/i);
  });
  it("semua 5: tersebar luas", () => {
    expect(templateExplanation(ctxFor(uniformAnswers(5))).ringkasan).toMatch(/tersebar luas/);
  });
  it("semua sama: belum membedakan", () => {
    expect(templateExplanation(ctxFor(uniformAnswers(3))).ringkasan).toMatch(/belum membedakan/);
  });
  it("normal: alasan berbasis aktivitas untuk setiap kategori rekomendasi dan lolos validator", () => {
    const t = templateExplanation(normal);
    expect(t.alasan.map((a) => a.category_id)).toEqual(normal.topGroup);
    expect(t.alasan[0].teks).toMatch(/skor 5/);
    expect(validateAiOutput(t, normal).ok).toBe(true);
  });
});
