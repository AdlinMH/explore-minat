import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { toXlsx } from "@/lib/xlsx";
import { EXPORT_HEADER, exportFileStamp, exportRow, type ExportSourceRow } from "@/lib/export-rows";
import { computeScores, scoresToRecord } from "@/lib/scoring";
import { answersByCategory } from "../helpers";

function sample(over: Partial<ExportSourceRow> = {}): ExportSourceRow {
  const answers = answersByCategory({ website: 5, game: 4 }, 2);
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "=HYPERLINK(\"http://x\")",
    class_label: "XII RPL 1",
    created_at: new Date("2026-11-20T01:30:00Z"), // 08:30 WIB
    questionnaire_version: "2026-11-v1",
    answers,
    scores: scoresToRecord(computeScores(answers)),
    highest_category_ids: ["website"],
    result_pattern: "normal",
    exploration_status: "mulai_gambaran",
    other_interest: "+cmd|' /C calc'!A0",
    reflection: "Suka & <senang> \"ngoding\"",
    ...over,
  };
}

async function unpack(rows: ReturnType<typeof exportRow>[]) {
  const buf = await toXlsx(rows);
  const files = unzipSync(new Uint8Array(buf));
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const shared = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  return { buf, sheet, shared, files };
}

describe("ekspor XLSX", () => {
  it("menghasilkan file zip xlsx dengan header dan satu baris data", async () => {
    const { buf, sheet, files } = await unpack([exportRow(sample())]);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(Object.keys(files)).toContain("xl/workbook.xml");
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Respons"');
    expect((sheet.match(/<row /g) ?? []).length).toBe(2);
    expect(sheet).toContain("<pane"); // baris judul dibekukan
  });

  it("tidak pernah menulis formula; teks berbahaya tersimpan sebagai teks", async () => {
    const { sheet, shared } = await unpack([exportRow(sample())]);
    expect(sheet).not.toMatch(/<f[ >]/);
    const text = sheet + shared;
    expect(text).toContain("<t>=HYPERLINK(\"http://x\")</t>");
    expect(text).toContain("+cmd|");
    expect(text).toContain("&lt;senang&gt;");
  });

  it("skor dan jawaban berupa sel angka", async () => {
    const row = exportRow(sample());
    const websiteCol = EXPORT_HEADER.indexOf("minat_website");
    expect(row[websiteCol]).toBe(100);
    const { sheet } = await unpack([row]);
    // Sel angka tidak punya t="s"/t="inlineStr" dan berisi <v>100</v>.
    expect(sheet).toMatch(/<c r="[A-Z]+2"(?: s="\d+")?><v>100<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="[A-Z]+2"(?: s="\d+")?><v>75<\/v><\/c>/);
  });

  it("waktu ditampilkan dalam WIB", async () => {
    const { sheet } = await unpack([exportRow(sample())]);
    const d = sheet.match(/<c r="D2"[^>]*><v>([\d.]+)<\/v>/);
    expect(d).not.toBeNull();
    // Serial Excel untuk 2026-11-20 08:30 (jam dinding WIB).
    const expected = (Date.UTC(2026, 10, 20, 8, 30) - Date.UTC(1899, 11, 30)) / 86400000;
    expect(Number(d![1])).toBeCloseTo(expected, 6);
  });

  it("pola selain normal tertulis 'Belum terbedakan', kosong tetap aman", async () => {
    const row = exportRow(sample({ result_pattern: "all_equal", other_interest: null, reflection: null }));
    expect(row[EXPORT_HEADER.indexOf("minat_tertinggi")]).toBe("Belum terbedakan");
    const { sheet } = await unpack([row]);
    expect(sheet).not.toMatch(/<f[ >]/);
  });

  it("nama file memakai tanggal WIB", () => {
    expect(exportFileStamp(new Date("2026-11-20T18:00:00Z"))).toBe("2026-11-21");
  });
});
