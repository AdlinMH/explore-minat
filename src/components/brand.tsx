import Link from "next/link";

/** Tanda geometris sederhana (bukan logo sekolah/perusahaan). */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" fill="#0f766e" />
      <circle cx="12" cy="13" r="5" fill="#99f6e4" />
      <path d="M17 24 L24 10 L28 24 Z" fill="#fcd34d" />
      <rect x="6" y="21" width="9" height="3" rx="1.5" fill="#e0f2fe" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight text-foreground">
      <BrandMark />
      <span>Jelajah Minat</span>
    </Link>
  );
}

export function GeoDecor({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
      <circle cx="250" cy="60" r="44" fill="#ccfbf1" />
      <rect x="40" y="110" width="90" height="90" rx="22" fill="#dbeafe" transform="rotate(-8 85 155)" />
      <path d="M150 190 L205 95 L260 190 Z" fill="#fef3c7" />
      <circle cx="120" cy="60" r="14" fill="#5eead4" />
      <rect x="215" y="140" width="56" height="14" rx="7" fill="#93c5fd" />
      <circle cx="70" cy="40" r="6" fill="#f59e0b" />
      <path d="M180 40 q12 -16 24 0 t24 0" stroke="#0f766e" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
