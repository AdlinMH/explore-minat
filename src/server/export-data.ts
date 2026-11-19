import "server-only";
import type { NextRequest } from "next/server";
import { adminCookieName, validateSessionToken } from "@/server/admin-auth";
import { getExportRows } from "@/server/admin-data";
import { parseFilters } from "@/lib/validation";
import { exportRow, type ExportValue } from "@/lib/export-rows";

/** Memeriksa sesi admin lalu mengambil baris ekspor sesuai filter di URL. null = tidak berwenang. */
export async function loadExportRows(req: NextRequest): Promise<ExportValue[][] | null> {
  const session = await validateSessionToken(req.cookies.get(adminCookieName())?.value);
  if (!session) return null;
  const filters = parseFilters(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await getExportRows({ ...filters, hal: undefined });
  return rows.map(exportRow);
}
