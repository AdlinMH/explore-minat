import { beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { hasDb, resetDb, adminSql } from "./setup";
import { saveResponse, getOwnedResponse, type ResponseRow } from "@/server/responses";
import { ensureExplanation, readExplanation } from "@/server/explanations";
import { AiCallError, classifyAiError, type AiCaller } from "@/server/openai";
import { submissionSchema } from "@/lib/validation";
import { answersByCategory } from "../helpers";

const GOOD = {
  ringkasan: "Kamu paling tertarik pada game saat ini. Minatmu bisa berubah setelah mencoba.",
  alasan: [{ category_id: "game", teks: "Kamu memberi skor 5 untuk membuat aturan game." }],
  profesi: [{ category_id: "game", profession_id: "game_designer", alasan: "Merancang aturan permainan." }],
  aktivitas_coba: "Rancang game kartu sederhana bersama teman.",
};

describe("klasifikasi error OpenAI", () => {
  const h = new Headers();
  it.each([
    [new OpenAI.AuthenticationError(401, { message: "x" }, "x", h), "auth"],
    [new OpenAI.RateLimitError(429, { code: "insufficient_quota" }, "x", h), "quota"],
    [new OpenAI.RateLimitError(429, { code: "rate_limit_exceeded" }, "x", h), "rate_limit"],
    [new OpenAI.APIConnectionTimeoutError(), "timeout"],
    [new OpenAI.InternalServerError(500, {}, "x", h), "server_error"],
    [new AiCallError("no_key"), "no_key"],
    [new Error("?"), "unknown"],
  ])("%s → %s", (err, code) => {
    expect(classifyAiError(err)).toBe(code);
  });
});

describe.skipIf(!hasDb)("penjelasan AI dengan cache", () => {
  let row: ResponseRow;
  let ownerKey: string;
  beforeEach(async () => {
    const classes = await resetDb();
    process.env.OPENAI_API_KEY = "sk-test-dummy-tidak-dipakai";
    process.env.OPENAI_MODEL = "model-uji";
    ownerKey = crypto.randomUUID();
    const r = await saveResponse(submissionSchema.parse({
      submissionKey: ownerKey, name: "Nama Rahasia", classId: classes[0].id, consent: true,
      answers: answersByCategory({ game: 5, website: 4, desain: 4 }, 2), explorationStatus: "belum_tahu",
      otherInterest: "Teks bebas rahasia", reflection: "Refleksi rahasia",
    }), "k");
    if (!r.ok) throw new Error("gagal");
    row = (await getOwnedResponse(r.responseId, ownerKey))!;
  });

  const goodFor = () => ({
    ...GOOD,
    alasan: row.top_category_ids.map((id) => ({ category_id: id, teks: "Kamu memberi skor tinggi pada aktivitas ini." })),
  });

  it("mock sukses: disimpan, payload tanpa nama/kelas/teks bebas, refresh tidak memanggil ulang", async () => {
    const caller = vi.fn<AiCaller>(async () => goodFor());
    const s1 = await ensureExplanation(row, caller);
    expect(s1.status).toBe("success");
    expect(s1.view.source).toBe("ai");
    const payload = JSON.stringify(caller.mock.calls[0][0]);
    for (const secret of ["Nama Rahasia", row.class_label, "Teks bebas rahasia", "Refleksi rahasia", row.id, ownerKey]) {
      expect(payload).not.toContain(secret);
    }
    const s2 = await ensureExplanation(row, caller);
    expect(s2.status).toBe("success");
    expect(caller).toHaveBeenCalledTimes(1);
    expect((await readExplanation(row)).status).toBe("success");
    // Skor tidak berubah.
    const sql = adminSql();
    const [r] = await sql`select scores, top_category_ids from responses where id = ${row.id}`;
    await sql.end();
    expect(r.scores).toEqual(row.scores);
  });

  it("request bersamaan hanya memanggil AI sekali", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const caller = vi.fn<AiCaller>(async () => { await gate; return goodFor(); });
    const p = Promise.all([ensureExplanation(row, caller), ensureExplanation(row, caller), ensureExplanation(row, caller)]);
    await new Promise((r) => setTimeout(r, 200));
    release();
    const states = await p;
    expect(caller).toHaveBeenCalledTimes(1);
    expect(states.filter((s) => s.status === "pending")).toHaveLength(2);
  });

  it("key belum tersedia: template tanpa memanggil AI dan tanpa label AI", async () => {
    delete process.env.OPENAI_API_KEY;
    const caller = vi.fn<AiCaller>();
    const s = await ensureExplanation(row, caller);
    expect(s.status).toBe("fallback");
    expect(s.view.source).toBe("template");
    expect(caller).not.toHaveBeenCalled();
    expect((await readExplanation(row)).aiEnabled).toBe(false);
  });

  it.each([
    ["auth gagal", new OpenAI.AuthenticationError(401, {}, "x", new Headers())],
    ["kuota habis", new OpenAI.RateLimitError(429, { code: "insufficient_quota" }, "x", new Headers())],
    ["timeout", new OpenAI.APIConnectionTimeoutError()],
  ])("%s → fallback template, dicatat, tidak mengulang tanpa batas", async (_n, err) => {
    const caller = vi.fn<AiCaller>(async () => { throw err; });
    const s = await ensureExplanation(row, caller);
    expect(s.status).toBe("fallback");
    expect(s.view.source).toBe("template");
    const again = await ensureExplanation(row, caller);
    expect(again.status).toBe("fallback");
    expect(caller).toHaveBeenCalledTimes(1);
  });

  it("retry terbatas untuk error sementara (maks 2 percobaan)", async () => {
    const caller = vi.fn<AiCaller>(async () => { throw new OpenAI.APIConnectionTimeoutError(); });
    await ensureExplanation(row, caller);
    const sql = adminSql();
    await sql`update result_explanations set updated_at = now() - interval '1 minute'`;
    await ensureExplanation(row, caller);
    await sql`update result_explanations set updated_at = now() - interval '1 minute'`;
    await ensureExplanation(row, caller);
    const [e] = await sql`select attempts, status, error_code from result_explanations`;
    await sql.end();
    expect(caller).toHaveBeenCalledTimes(2);
    expect(e).toMatchObject({ attempts: 2, status: "fallback", error_code: "timeout" });
  });

  it("output invalid atau ID profesi tidak dikenal → fallback", async () => {
    const bad = vi.fn<AiCaller>(async () => ({ ...goodFor(), profesi: [{ category_id: "game", profession_id: "astronot", alasan: "Pergi ke bulan." }] }));
    const s = await ensureExplanation(row, bad);
    expect(s.view.source).toBe("template");
    const sql = adminSql();
    const [e] = await sql`select status, error_code, content from result_explanations`;
    await sql.end();
    expect(e).toMatchObject({ status: "fallback", error_code: "unknown_profession", content: null });
  });

  it("lease kedaluwarsa dapat diklaim ulang (pemulihan request terputus)", async () => {
    const sql = adminSql();
    await sql`insert into result_explanations (response_id, questionnaire_version, prompt_version, model, status, attempts, lease_until)
      values (${row.id}, ${row.questionnaire_version}, 'p1-2026-11', 'model-uji', 'pending', 1, now() - interval '1 second')`;
    await sql.end();
    const caller = vi.fn<AiCaller>(async () => goodFor());
    expect((await ensureExplanation(row, caller)).status).toBe("success");
    expect(caller).toHaveBeenCalledTimes(1);
  });
});
