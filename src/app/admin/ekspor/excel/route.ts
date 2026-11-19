import { NextResponse, type NextRequest } from "next/server";
import { loadExportRows } from "@/server/export-data";
import { toXlsx } from "@/lib/xlsx";
import { exportFileStamp } from "@/lib/export-rows";

export async function GET(req: NextRequest) {
  const rows = await loadExportRows(req);
  if (!rows) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const file = await toXlsx(rows);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="eksplorasi-minat-${exportFileStamp()}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
