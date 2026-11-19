import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function scrypt(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/**
 * Format hash: scrypt:N:r:p:salt(base64url):hash(base64url).
 * Pemisah ":" dipakai agar aman di file .env (tanpa "$" yang bisa di-expand).
 */
export async function hashPin(pin: string): Promise<string> {
  const N = 32768, r = 8, p = 1;
  const salt = randomBytes(16);
  const key = await scrypt(pin, salt, 32, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nS, rS, pS, saltS, hashS] = parts;
  const N = Number(nS), r = Number(rS), p = Number(pS);
  if (![N, r, p].every((x) => Number.isInteger(x) && x > 0) || N > 1 << 20) return false;
  const expected = Buffer.from(hashS, "base64url");
  if (expected.length < 16) return false;
  const key = await scrypt(pin, Buffer.from(saltS, "base64url"), expected.length, { N, r, p });
  return timingSafeEqual(key, expected);
}
