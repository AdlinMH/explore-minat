import "server-only";
import { cookies } from "next/headers";
import { cookieSecure } from "@/server/admin-auth";

export function ownerCookieName() {
  return cookieSecure() ? "__Host-emk_pemilik" : "emk_pemilik";
}

export async function setOwnerCookie(submissionKey: string) {
  (await cookies()).set(ownerCookieName(), submissionKey, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readOwnerKey() {
  return (await cookies()).get(ownerCookieName())?.value;
}
