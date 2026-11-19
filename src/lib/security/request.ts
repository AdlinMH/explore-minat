import "server-only";
import { headers } from "next/headers";
import { sha256Hex } from "@/lib/security/crypto";

export class ForbiddenOriginError extends Error {}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Pemeriksaan origin untuk semua mutasi (Server Action sudah memeriksa ini
 * secara bawaan; ini lapisan eksplisit tambahan dan dipakai Route Handler).
 */
export function isAllowedOrigin(h: Headers): boolean {
  const origin = hostOf(h.get("origin"));
  if (!origin) return false;
  const allowed = new Set<string>();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) allowed.add(host.split(",")[0].trim().toLowerCase());
  for (const o of (process.env.APP_ORIGIN ?? "").split(",")) {
    const hh = hostOf(o.trim());
    if (hh) allowed.add(hh);
  }
  return allowed.has(origin);
}

export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  if (!isAllowedOrigin(h)) throw new ForbiddenOriginError("Permintaan ditolak.");
}

/**
 * IP klien dari header yang ditetapkan platform. Di Vercel, x-forwarded-for
 * ditulis ulang oleh edge sehingga tepercaya. Di luar Vercel, header proxy
 * hanya dipercaya bila TRUST_PROXY=1; jika tidak, semua klien berbagi satu
 * bucket "unknown" dan hanya batas global yang efektif.
 */
export function clientIpFrom(h: Headers): string {
  const trusted = process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1";
  if (!trusted) return "unknown";
  const v = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ip = v?.split(",")[0].trim();
  return ip && ip.length <= 64 ? ip : "unknown";
}

/** Bucket rate limit memakai hash IP agar IP mentah tidak tersimpan. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  return sha256Hex(`ip:${clientIpFrom(h)}`).slice(0, 32);
}
