import { NextResponse, type NextRequest } from "next/server";
import { isAllowedOrigin } from "@/lib/security/request";
import { getOwnedResponse, getResponseForAdmin } from "@/server/responses";
import { ownerCookieName } from "@/server/owner-cookie";
import { adminCookieName, validateSessionToken } from "@/server/admin-auth";
import { ensureExplanation } from "@/server/explanations";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest, ctx: RouteContext<"/api/hasil/[id]/penjelasan">) {
  if (!isAllowedOrigin(req.headers)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  const { id } = await ctx.params;

  let row = await getOwnedResponse(id, req.cookies.get(ownerCookieName())?.value);
  if (!row && (await validateSessionToken(req.cookies.get(adminCookieName())?.value))) {
    row = await getResponseForAdmin(id);
  }
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  try {
    const state = await ensureExplanation(row);
    return NextResponse.json(
      { status: state.status, source: state.view.source, content: state.view.content },
      { headers: NO_STORE },
    );
  } catch {
    console.error("[penjelasan] gagal memproses");
    return NextResponse.json({ status: "fallback", source: "template", content: null }, { status: 200, headers: NO_STORE });
  }
}
