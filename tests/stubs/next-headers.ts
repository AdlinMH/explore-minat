// Stub minimal untuk pengujian di luar runtime Next.js.
const jar = new Map<string, string>();
let hdrs = new Headers();
export function __setHeaders(h: Record<string, string>) { hdrs = new Headers(h); }
export function __cookies() { return jar; }
export async function headers() { return hdrs; }
export async function cookies() {
  return {
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  };
}
