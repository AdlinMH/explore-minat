import Link from "next/link";

export default function NotFound() {
  return (
    <main id="konten" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-muted-foreground">Alamat yang kamu buka tidak tersedia.</p>
      <Link href="/" className="mx-auto mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Ke halaman awal</Link>
    </main>
  );
}
