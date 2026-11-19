import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { nameSchema, pinSchema, submissionSchema, filterSchema } from "@/lib/validation";
import { uniformAnswers } from "../helpers";

describe("CSV", () => {
  it.each(["=1+1", "+cmd", "-2", "@SUM(A1)", "\t=x", " =HYPERLINK()"])("menetralkan formula: %s", (v) => {
    expect(csvCell(v).replace(/^"/, "").startsWith("'")).toBe(true);
  });
  it("escape koma, kutip, baris baru", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(toCsv([["x", 1]])).toBe("﻿x,1\r\n");
  });
});

describe("validasi input", () => {
  it("nama Indonesia wajar diterima dan dirapikan", () => {
    for (const n of ["Siti Nur’aini", "M. Rizky", "Ni Made Ayu", "Ahmad Al-Fatih", "Ömer", "Br. Ginting, S"]) {
      expect(nameSchema.safeParse(`  ${n}  `).success).toBe(true);
    }
    expect(nameSchema.parse("  Budi    Santoso ")).toBe("Budi Santoso");
  });
  it("nama ditolak bila terlalu pendek/panjang atau berisi formula/HTML", () => {
    for (const n of ["A", " ", "x".repeat(101), "=cmd", "<script>", "Budi123"]) {
      expect(nameSchema.safeParse(n).success).toBe(false);
    }
  });
  it("PIN tepat 6 digit termasuk nol di depan", () => {
    expect(pinSchema.safeParse("012345").success).toBe(true);
    for (const p of ["12345", "1234567", "12a456", " 123456", "123456 "]) expect(pinSchema.safeParse(p).success).toBe(false);
  });
  it("submission mensyaratkan consent, status, panjang teks", () => {
    const base = {
      submissionKey: crypto.randomUUID(), name: "Budi", classId: crypto.randomUUID(), consent: true,
      answers: uniformAnswers(3), explorationStatus: "belum_tahu", otherInterest: "", reflection: "",
    };
    expect(submissionSchema.safeParse(base).success).toBe(true);
    expect(submissionSchema.parse(base).otherInterest).toBeNull();
    expect(submissionSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, explorationStatus: "x" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, otherInterest: "a".repeat(301) }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, reflection: "a".repeat(501) }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, reflection: "a".repeat(500) }).success).toBe(true);
  });
  it("filter tidak valid diabaikan, bukan error", () => {
    expect(filterSchema.parse({ kelas: "bukan-uuid", dari: "2026-13-45", hal: "-3" })).toEqual({ kelas: undefined, dari: undefined, sampai: undefined, cari: undefined, hal: undefined });
  });
});
