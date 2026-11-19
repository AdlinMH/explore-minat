import { NextResponse, type NextRequest } from "next/server";
import { loadExportRows } from "@/server/export-data";
import { toCsv } from "@/lib/csv";
import { EXPORT_HEADER, exportFileStamp } from "@/lib/export-rows";

export async function GET(req: NextRequest) {
  const rows = await loadExportRows(req);
  if (!rows) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" });
  const body = rows.map((r) => r.map((v) => (v instanceof Date ? fmt.format(v) : v)));
  return new NextResponse(toCsv([[...EXPORT_HEADER], ...body]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eksplorasi-minat-${exportFileStamp()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
