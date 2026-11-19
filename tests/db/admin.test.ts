import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hasDb, resetDb, adminSql } from "./setup";
import { attemptLogin, revokeAllSessions, revokeSessionToken, validateSessionToken } from "@/server/admin-auth";
import { hashPin, verifyPin } from "@/lib/security/crypto";
import { getStatRows, getTablePage, getExportRows, addClass, deleteClassIfEmpty, renameClass } from "@/server/admin-data";
import { saveResponse } from "@/server/responses";
import { submissionSchema } from "@/lib/validation";
import { primaryDistribution } from "@/lib/stats";
import { answersByCategory } from "../helpers";
import { isAllowedOrigin } from "@/lib/security/request";

describe("hash PIN", () => {
  it("verifikasi benar/salah dan nol di depan dipertahankan", async () => {
    const h = await hashPin("004321");
    expect(h).not.toContain("004321");
    expect(await verifyPin("004321", h)).toBe(true);
    expect(await verifyPin("4321", h)).toBe(false);
    expect(await verifyPin("004322", h)).toBe(false);
    expect(await verifyPin("004321", "rusak")).toBe(false);
  });
});

describe("origin/CSRF", () => {
  it("hanya origin yang sama yang diterima", () => {
    expect(isAllowedOrigin(new Headers({ origin: "https://app.test", host: "app.test" }))).toBe(true);
    expect(isAllowedOrigin(new Headers({ origin: "https://evil.test", host: "app.test" }))).toBe(false);
    expect(isAllowedOrigin(new Headers({ host: "app.test" }))).toBe(false);
    expect(isAllowedOrigin(new Headers({ origin: "null", host: "app.test" }))).toBe(false);
  });
});

describe.skipIf(!hasDb)("login & sesi admin", () => {
  beforeAll(async () => { process.env.ADMIN_PIN_HASH = await hashPin("012345"); });
  beforeEach(async () => { await resetDb(); });

  it("PIN salah ditolak secara generik, PIN benar membuat sesi; hanya hash token disimpan", async () => {
    expect(await attemptLogin("999999", "ip1")).toEqual({ ok: false, reason: "invalid" });
    expect(await attemptLogin("12345", "ip1")).toEqual({ ok: false, reason: "invalid" });
    const ok = await attemptLogin("012345", "ip1");
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(await validateSessionToken(ok.token)).not.toBeNull();
    const sql = adminSql();
    const rows = await sql`select token_hash from admin_sessions`;
    await sql.end();
    expect(rows[0].token_hash).not.toBe(ok.token);
    expect(rows[0].token_hash).toHaveLength(64);
  });

  it("tanpa token / token palsu tidak punya sesi", async () => {
    expect(await validateSessionToken(undefined)).toBeNull();
    expect(await validateSessionToken("palsu")).toBeNull();
  });

  it("rate limit per sumber dan global, persisten di database", async () => {
    let limited = false;
    for (let i = 0; i < 9; i++) {
      const r = await attemptLogin("000000", "penyerang");
      if (!r.ok && r.reason === "limited") limited = true;
    }
    expect(limited).toBe(true);
    // Bahkan PIN benar dari sumber yang sama ditolak selama window berlaku.
    expect(await attemptLogin("012345", "penyerang")).toEqual({ ok: false, reason: "limited" });
    // Pembatas global: banyak sumber berbeda.
    let globalLimited = false;
    for (let i = 0; i < 70; i++) {
      const r = await attemptLogin("000000", `ip-${i}`);
      if (!r.ok && r.reason === "limited") { globalLimited = true; break; }
    }
    expect(globalLimited).toBe(true);
  });

  it("expiry, logout, dan rotasi kredensial mencabut sesi", async () => {
    const a = await attemptLogin("012345", "x");
    const b = await attemptLogin("012345", "y");
    if (!a.ok || !b.ok) throw new Error("login gagal");
    await revokeSessionToken(a.token);
    expect(await validateSessionToken(a.token)).toBeNull();
    expect(await validateSessionToken(b.token)).not.toBeNull();

    const sql = adminSql();
    await sql`update admin_sessions set expires_at = now() - interval '1 second'`;
    expect(await validateSessionToken(b.token)).toBeNull();
    await sql`update admin_sessions set expires_at = now() + interval '1 hour', revoked_at = null`;
    expect(await validateSessionToken(b.token)).not.toBeNull();
    const old = process.env.ADMIN_PIN_HASH;
    process.env.ADMIN_PIN_HASH = await hashPin("654321");
    expect(await validateSessionToken(b.token)).toBeNull();
    process.env.ADMIN_PIN_HASH = old;
    expect(await revokeAllSessions()).toBeGreaterThan(0);
    expect(await validateSessionToken(b.token)).toBeNull();
    await sql.end();
  });

  it("tanpa ADMIN_PIN_HASH login tidak mungkin", async () => {
    const old = process.env.ADMIN_PIN_HASH;
    delete process.env.ADMIN_PIN_HASH;
    expect(await attemptLogin("012345", "z")).toEqual({ ok: false, reason: "unconfigured" });
    process.env.ADMIN_PIN_HASH = old;
  });
});

describe.skipIf(!hasDb)("data admin: filter konsisten", () => {
  let classes: { id: string; label: string }[];
  beforeEach(async () => {
    classes = await resetDb();
    const mk = (name: string, classId: string, ans: Record<string, number>) =>
      saveResponse(submissionSchema.parse({ submissionKey: crypto.randomUUID(), name, classId, consent: true, answers: ans, explorationStatus: "mulai_gambaran" }), "seed");
    await mk("Andi", classes[0].id, answersByCategory({ game: 5 }, 2));
    await mk("Budi", classes[0].id, answersByCategory({ game: 5, qa: 5 }, 2));
    await mk("Cici", classes[1].id, answersByCategory({}, 3));
    await mk("Andika", classes[1].id, answersByCategory({ desain: 4 }, 2));
    const sql = adminSql();
    // Respons "kemarin" 23.30 WIB → masih tanggal kemarin di Jakarta walau UTC berbeda hari.
    await sql`update responses set created_at = '2026-11-18 16:30:00+00' where name = 'Andika'`;
    await sql.end();
  });

  it("filter kelas berlaku pada data statistik, tabel, dan ekspor", async () => {
    const f = { kelas: classes[0].id };
    expect((await getStatRows(f)).length).toBe(2);
    expect((await getTablePage(f)).total).toBe(2);
    expect((await getExportRows(f)).length).toBe(2);
    const d = primaryDistribution(await getStatRows(f));
    expect(d.items.find((i) => i.id === "game")!.weight).toBe(1.5);
    expect(d.items.find((i) => i.id === "qa")!.weight).toBe(0.5);
  });

  it("filter tanggal memakai Asia/Jakarta", async () => {
    expect((await getStatRows({ dari: "2026-11-18", sampai: "2026-11-18" })).length).toBe(1);
    expect((await getStatRows({ sampai: "2026-11-18" })).length).toBe(1);
    expect((await getStatRows({ dari: "2026-11-19" })).length).toBe(3);
  });

  it("pencarian nama hanya mempengaruhi tabel & ekspor, aman dari wildcard", async () => {
    const f = { cari: "andi" };
    expect((await getTablePage(f)).total).toBe(2);
    expect((await getExportRows(f)).length).toBe(2);
    expect((await getStatRows(f)).length).toBe(4);
    expect((await getTablePage({ cari: "%" })).total).toBe(0);
  });

  it("kelas berisi respons tidak bisa dihapus; label unik", async () => {
    expect(await deleteClassIfEmpty(classes[0].id)).toBe(false);
    expect(await addClass("XII RPL 3")).toBe(true);
    expect(await addClass("xii rpl 3")).toBe(false);
    expect(await renameClass(classes[0].id, "XII RPL 2")).toBe(false);
  });

  it("pagination server-side", async () => {
    const p = await getTablePage({ hal: 2 });
    expect(p.rows).toHaveLength(0);
    expect(p.pageCount).toBe(1);
  });
});
