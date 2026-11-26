import { beforeEach, describe, expect, it } from "vitest";
import { QUESTIONNAIRE_VERSION } from "@/config/questionnaire";
import { hasDb, resetDb, adminSql } from "./setup";
import { getOwnedResponse, saveResponse, listActiveClasses } from "@/server/responses";
import { submissionSchema } from "@/lib/validation";
import { answersByCategory, uniformAnswers } from "../helpers";

describe.skipIf(!hasDb)("penyimpanan respons", () => {
  let classes: { id: string; label: string }[];
  beforeEach(async () => { classes = await resetDb(); });

  const input = (over: Record<string, unknown> = {}) =>
    submissionSchema.parse({
      submissionKey: crypto.randomUUID(), name: "Siswa Uji", classId: classes[0].id, consent: true,
      answers: answersByCategory({ game: 5 }, 2), explorationStatus: "belum_tahu", otherInterest: "Arsitek", reflection: "", ...over,
    });

  it("menyimpan dan menghitung ulang skor di server", async () => {
    const i = input();
    const r = await saveResponse(i, "k1");
    expect(r.ok).toBe(true);
    const sql = adminSql();
    const [row] = await sql`select scores, top_category_ids, highest_category_ids, result_pattern, questionnaire_version from responses`;
    await sql.end();
    expect(row.scores.game).toBe(15);
    expect(row.highest_category_ids).toEqual(["game"]);
    expect(row.result_pattern).toBe("normal");
    expect(row.questionnaire_version).toBe(QUESTIONNAIRE_VERSION);
  });

  it("pilihan penentu disimpan sebagai minat tertinggi; pilihan tidak sah diabaikan", async () => {
    const sql = adminSql();
    const tied = answersByCategory({ desain: 5, konten: 5 }, 2);
    expect((await saveResponse(input({ answers: tied, tieBreak: "konten" }), "k1")).ok).toBe(true);
    expect((await saveResponse(input({ answers: tied, tieBreak: "qa" }), "k2")).ok).toBe(true);
    const rows = await sql`select highest_category_ids, top_category_ids from responses order by created_at`;
    await sql.end();
    expect(rows[0].highest_category_ids).toEqual(["konten"]);
    expect(rows[0].top_category_ids[0]).toBe("konten");
    expect(rows[1].highest_category_ids).toEqual(["desain", "konten"]);
  });

  it("double click / retry dengan submission_key sama tidak membuat respons ganda", async () => {
    const i = input();
    const results = await Promise.all([saveResponse(i, "k"), saveResponse(i, "k"), saveResponse(i, "k")]);
    const ids = new Set(results.map((r) => (r.ok ? r.responseId : null)));
    expect(ids.size).toBe(1);
    const again = await saveResponse(i, "k");
    expect(again.ok && again.duplicate).toBe(true);
    const sql = adminSql();
    const [{ count }] = await sql`select count(*)::int as count from responses`;
    await sql.end();
    expect(count).toBe(1);
  });

  it("nama sama dengan key berbeda tetap tersimpan sebagai respons terpisah", async () => {
    await saveResponse(input(), "k");
    await saveResponse(input(), "k");
    const sql = adminSql();
    const [{ count }] = await sql`select count(*)::int as count from responses`;
    await sql.end();
    expect(count).toBe(2);
  });

  it("kelas nonaktif ditolak dan tidak muncul di daftar", async () => {
    const sql = adminSql();
    await sql`update classes set is_active = false where id = ${classes[1].id}`;
    await sql.end();
    expect((await listActiveClasses()).map((c) => c.id)).toEqual([classes[0].id]);
    const r = await saveResponse(input({ classId: classes[1].id }), "k");
    expect(r).toEqual({ ok: false, reason: "class_inactive" });
  });

  it("siswa tidak bisa membaca hasil siswa lain; ID acak tidak bisa ditebak", async () => {
    const a = input();
    const b = input({ answers: uniformAnswers(4), name: "Siswa Lain" });
    const ra = await saveResponse(a, "k");
    const rb = await saveResponse(b, "k");
    if (!ra.ok || !rb.ok) throw new Error("gagal");
    expect((await getOwnedResponse(ra.responseId, a.submissionKey))?.name).toBe("Siswa Uji");
    expect(await getOwnedResponse(rb.responseId, a.submissionKey)).toBeNull();
    expect(await getOwnedResponse(ra.responseId, undefined)).toBeNull();
    expect(await getOwnedResponse(ra.responseId, "bukan-uuid")).toBeNull();
    expect(await getOwnedResponse("1", a.submissionKey)).toBeNull();
  });

  it("rate limit pengiriman bekerja per sumber", async () => {
    let limited = false;
    for (let n = 0; n < 152; n++) {
      const r = await saveResponse(input(), "spam");
      if (!r.ok && r.reason === "limited") { limited = true; break; }
    }
    expect(limited).toBe(true);
    // Sumber lain tetap bisa mengirim (satu kelas berbagi IP tidak terkunci oleh sumber lain).
    expect((await saveResponse(input(), "lain")).ok).toBe(true);
  });

  it("role anon dan authenticated ditolak membaca/menulis tabel sensitif", async () => {
    const sql = adminSql();
    for (const role of ["anon", "authenticated"]) {
      for (const t of ["responses", "admin_sessions", "rate_limits", "result_explanations", "classes"]) {
        await expect(sql.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx.unsafe(`select * from public.${t} limit 1`);
        })).rejects.toThrow(/permission denied/);
      }
      await expect(sql.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx.unsafe(`insert into public.rate_limits (bucket, window_start) values ('x', now())`);
      })).rejects.toThrow(/permission denied/);
    }
    const rls = await sql`select relname, relrowsecurity from pg_class where relname in ('classes','responses','admin_sessions','rate_limits','result_explanations')`;
    await sql.end();
    expect(rls.every((r) => r.relrowsecurity)).toBe(true);
  });
});
