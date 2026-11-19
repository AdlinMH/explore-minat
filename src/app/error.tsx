"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="konten" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Terjadi gangguan</h1>
      <p className="mt-2 text-muted-foreground">Halaman belum bisa dimuat. Coba lagi sebentar.</p>
      <button type="button" onClick={reset} className="mx-auto mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Coba lagi</button>
    </main>
  );
}
