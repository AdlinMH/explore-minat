import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Brand />
      </header>
      <main id="konten" className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-16 pt-4 sm:px-6 md:pt-10">
        <section className="emk-rise max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <Sparkles className="size-4" aria-hidden="true" /> Kuis eksplorasi minat karier
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl md:text-5xl">
            Kamu Paling Cocok di Bidang Apa?
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted-foreground">
            Jawab 24 pertanyaan singkat dan lihat bidang kerja yang paling menarik buatmu sekarang. Hasilnya bukan ramalan, tapi bisa jadi titik awal untuk mencoba.
          </p>
          <ul className="mt-6 grid gap-3 text-base">
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>Sekitar 5–8 menit.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>Ini bukan ujian. Tidak ada jawaban benar atau salah, dan kamu tidak harus sudah bisa atau pernah mencobanya.</span>
            </li>
          </ul>
          <Link
            href="/isi"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Mulai kuis <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-sm text-muted-foreground sm:px-6">
        Hasil kuis menggambarkan ketertarikan saat ini, bukan tes kemampuan atau tes psikologi.
      </footer>
    </div>
  );
}
