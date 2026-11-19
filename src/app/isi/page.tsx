import type { Metadata } from "next";
import { connection } from "next/server";
import { Brand } from "@/components/brand";
import { Quiz } from "@/components/quiz/quiz";
import { listActiveClasses } from "@/server/responses";

export const metadata: Metadata = { title: "Isi kuis" };

export default async function IsiPage() {
  await connection(); // daftar kelas selalu dibaca saat request, bukan saat build
  let classes: { id: string; label: string }[] = [];
  let loadError = false;
  try {
    classes = await listActiveClasses();
  } catch {
    loadError = true;
  }
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-3 sm:px-6">
        <Brand />
      </header>
      <main id="konten" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-destructive/30 bg-card p-6">
            <h1 className="text-xl font-semibold">Kuis belum bisa dibuka</h1>
            <p className="mt-2 text-muted-foreground">Server sedang bermasalah. Muat ulang halaman ini beberapa saat lagi.</p>
          </div>
        ) : (
          <Quiz classes={classes} />
        )}
      </main>
    </div>
  );
}
