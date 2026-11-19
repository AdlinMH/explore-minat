import { describe, expect, it } from "vitest";
import { categoryReasons } from "@/lib/reasons";
import { uniformAnswers } from "../helpers";

describe("alasan bidang", () => {
  it("tiga pernyataan bidang, urut dari skor tertinggi, dengan label skala", () => {
    const a = { ...uniformAnswers(3), q05: 2, q13: 5, q21: 4 };
    const r = categoryReasons("ai_data", a);
    expect(r.map((x) => x.questionId)).toEqual(["q13", "q21", "q05"]);
    expect(r.map((x) => x.label)).toEqual(["Sangat tertarik", "Tertarik", "Kurang tertarik"]);
  });
  it("seri mengikuti nomor pertanyaan dan hanya bidang yang diminta", () => {
    const r = categoryReasons("website", uniformAnswers(4));
    expect(r.map((x) => x.questionId)).toEqual(["q02", "q10", "q18"]);
    expect(r.every((x) => x.value === 4)).toBe(true);
  });
});
