import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSql } from "@/server/db";
import { consumeRateLimits } from "@/server/rate-limit";
import { randomToken, sha256Hex, verifyPin } from "@/lib/security/crypto";

export const SESSION_HOURS = 8;

export function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
}

export function adminCookieName(): string {
  return cookieSecure() ? "__Host-emk_admin" : "emk_admin";
}

/**
 * Sidik jari kredensial: sesi yang dibuat dengan ADMIN_PIN_HASH lama otomatis
 * tidak berlaku setelah hash dirotasi (atau ADMIN_SESSION_EPOCH diubah).
 */
export function credentialFingerprint(): string | null {
  const hash = process.env.ADMIN_PIN_HASH?.trim();
  if (!hash) return null;
  return sha256Hex(`fp:${hash}:${process.env.ADMIN_SESSION_EPOCH ?? ""}`).slice(0, 32);
}

export type LoginResult = { ok: true; token: string; expiresAt: Date } | { ok: false; reason: "invalid" | "limited" | "unconfigured" };

/** Logika login murni (tanpa cookie), dapat diuji langsung. */
export async function attemptLogin(pin: string, clientKey: string): Promise<LoginResult> {
  const allowed = await consumeRateLimits([
    { bucket: `login:ip:${clientKey}`, limit: 8, windowSeconds: 15 * 60 },
    { bucket: "login:global", limit: 60, windowSeconds: 15 * 60 },
  ]);
  if (!allowed) return { ok: false, reason: "limited" };

  const stored = process.env.ADMIN_PIN_HASH?.trim();
  const fp = credentialFingerprint();
  if (!stored || !fp) return { ok: false, reason: "unconfigured" };
  if (!/^\d{6}$/.test(pin)) return { ok: false, reason: "invalid" };
  const valid = await verifyPin(pin, stored).catch(() => false);
  if (!valid) return { ok: false, reason: "invalid" };

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const sql = getSql();
  await sql`
    insert into public.admin_sessions (token_hash, credential_fingerprint, expires_at)
    values (${sha256Hex(token)}, ${fp}, ${expiresAt})
  `;
  await sql`delete from public.admin_sessions where expires_at < now() - interval '7 days'`;
  return { ok: true, token, expiresAt };
}

export async function validateSessionToken(token: string | undefined | null): Promise<{ id: string } | null> {
  if (!token || token.length > 200) return null;
  const fp = credentialFingerprint();
  if (!fp) return null;
  const sql = getSql();
  const [row] = await sql<{ id: string }[]>`
    select id from public.admin_sessions
    where token_hash = ${sha256Hex(token)}
      and revoked_at is null
      and expires_at > now()
      and credential_fingerprint = ${fp}
  `;
  return row ?? null;
}

export async function revokeSessionToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await getSql()`update public.admin_sessions set revoked_at = now() where token_hash = ${sha256Hex(token)} and revoked_at is null`;
}

export async function revokeAllSessions(): Promise<number> {
  const rows = await getSql()`update public.admin_sessions set revoked_at = now() where revoked_at is null returning id`;
  return rows.length;
}

/** Untuk Server Component, Server Action, dan Route Handler admin. */
export async function getAdminSession() {
  const store = await cookies();
  return validateSessionToken(store.get(adminCookieName())?.value);
}

/** Wajib dipanggil di setiap halaman/aksi/handler admin; redirect jika tidak ada sesi. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function setAdminCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(adminCookieName(), token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  const token = store.get(adminCookieName())?.value;
  await revokeSessionToken(token);
  store.delete(adminCookieName());
}
