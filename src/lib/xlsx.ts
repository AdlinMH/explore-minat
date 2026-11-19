import "server-only";
import writeExcelFile from "write-excel-file/node";
import { EXPORT_HEADER, EXPORT_TIME_COLUMN, toWibWallClock, type ExportValue } from "@/lib/export-rows";

const WIDTHS: Record<string, number> = {
  id: 38, nama: 26, kelas: 12, waktu_wib: 19, versi_kuesioner: 14,
  minat_tertinggi: 28, status_eksplorasi: 30, minat_lainnya: 36, refleksi: 48,
};

/**
 * Membuat file .xlsx. Semua teks ditulis sebagai sel String (bukan formula),
 * jadi isian siswa yang diawali "=" tidak dieksekusi Excel.
 */
export async function toXlsx(rows: ExportValue[][]): Promise<Buffer> {
  const header = EXPORT_HEADER.map((h) => ({ value: h, type: String, fontWeight: "bold" as const }));
  const body = rows.map((row) =>
    row.map((v, i) => {
      if (v === null) return null;
      if (i === EXPORT_TIME_COLUMN && v instanceof Date) {
        return { value: toWibWallClock(v), type: Date, format: "yyyy-mm-dd hh:mm:ss" };
      }
      if (typeof v === "number") return { value: v, type: Number };
      return { value: String(v), type: String };
    }),
  );
  const columns = EXPORT_HEADER.map((h) => ({ width: WIDTHS[h] ?? (h.startsWith("minat_") ? 15 : 6) }));
  return writeExcelFile([header, ...body], { sheet: "Respons", columns, stickyRowsCount: 1 }).toBuffer();
}
