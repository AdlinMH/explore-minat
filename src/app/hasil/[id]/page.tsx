import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Compass, Lightbulb, MessageSquareText, Search } from "lucide-react";
import { Brand } from "@/components/brand";
import { CategoryIcon } from "@/components/category-icon";
import { HBarChart } from "@/components/charts/hbar-chart";
import { CATEGORY_BY_ID, EXPLORATION_LABEL, RESULT_DISCLAIMER, type CategoryId } from "@/config/questionnaire";
import { formatScore, roundOne, scoresFromRecord, sortByScore } from "@/lib/scoring";
import { getOwnedResponse } from "@/server/responses";
import { readOwnerKey } from "@/server/owner-cookie";
import { categoryReasons } from "@/lib/reasons";

export const metadata: Metadata = { title: "Hasil kuis", robots: { index: false, follow: false } };

export default async function HasilPage({ params }: PageProps<"/hasil/[id]">) {
  const { id } = await params;
  const row = await getOwnedResponse(id, await readOwnerKey());

  if (!row) {
    return (
      <Shell>
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-2xl font-bold">Hasil tidak dapat dibuka</h1>
          <p className="mt-2 text-muted-foreground">
            Hasil kuis hanya bisa dibuka di perangkat yang dipakai saat mengirim jawaban. Jika kamu belum mengisi, mulai kuis dari awal.
          </p>
          <Link href="/isi" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
            Mulai kuis
          </Link>
        </div>
      </Shell>
    );
  }

  const cats = scoresFromRecord(row.scores);
  const sorted = sortByScore(cats);
  const topGroup = row.top_category_ids as CategoryId[];
  const intensityOf = (cid: CategoryId) => cats.find((x) => x.id === cid)!.intensity;
  // Bidang dengan skor tertinggi tampil terbuka (lebih dari satu hanya jika seri);
  // peringkat 2–3 (termasuk yang seri) disembunyikan dalam collapsible.
  const highest = new Set(row.highest_category_ids);
  const mainIds = topGroup.filter((cid) => highest.has(cid));
  const otherIds = topGroup.filter((cid) => !highest.has(cid));
  const chartData = cats.map((c) => ({
    id: c.id,
    label: CATEGORY_BY_ID[c.id].shortLabel,
    value: roundOne(c.intensity),
    color: CATEGORY_BY_ID[c.id].color,
  }));

  const patternNote =
    row.result_pattern === "all_min"
      ? "Saat ini belum ada kegiatan dalam daftar yang menarik minatmu. Itu wajar—coba beberapa kegiatan dulu, lalu isi lagi nanti."
      : row.result_pattern === "all_max"
        ? "Kamu tertarik pada semua bidang. Ketertarikanmu tersebar luas, jadi belum ada satu bidang yang menonjol."
        : row.result_pattern === "all_equal"
          ? "Skormu sama di semua bidang, jadi minatmu belum membedakan bidang tertentu."
          : null;

  return (
    <Shell>
      <div className="emk-rise">
        <p className="text-sm font-medium text-muted-foreground">{row.class_label}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Hai, {row.name}! Ini hasil eksplorasimu.</h1>
        <p className="mt-3 rounded-xl bg-secondary/70 p-3 text-sm text-secondary-foreground">{RESULT_DISCLAIMER}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm">
          <Compass className="size-4 text-primary" aria-hidden="true" />
          Status: <strong className="font-semibold">{EXPLORATION_LABEL[row.exploration_status]}</strong>
        </span>
        {row.other_interest && (
          <span className="inline-flex max-w-full items-start gap-1.5 rounded-2xl border bg-card px-3 py-1.5 text-sm">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 break-words">Minat lainnya: <strong className="font-semibold">{row.other_interest}</strong></span>
          </span>
        )}
      </div>

      <section aria-labelledby="rekomendasi-judul" className="mt-6">
        <h2 id="rekomendasi-judul" className="text-xl font-bold">
          {topGroup.length > 0 ? "Bidang yang paling menarik untukmu saat ini" : "Bidang yang menarik untukmu"}
        </h2>
        {patternNote && <p className="mt-2 rounded-xl border bg-card p-4">{patternNote}</p>}
        {mainIds.length > 0 && (
          <div className="mt-4 grid gap-4">
            {mainIds.map((cid) => <CategoryCard key={cid} id={cid} intensity={intensityOf(cid)} answers={row.answers} />)}
          </div>
        )}
      </section>

      {otherIds.length > 0 && (
        <details className="group mt-8 rounded-2xl border bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3">
            <span className="flex-1">
              <span className="block font-semibold">Kelihatan menarik untukmu juga</span>
              <span className="block text-sm text-muted-foreground">
                {otherIds.map((cid) => CATEGORY_BY_ID[cid].label).join(", ")}
              </span>
            </span>
            <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t p-4">
            {otherIds.map((cid) => <CategoryCard key={cid} id={cid} intensity={intensityOf(cid)} answers={row.answers} />)}
          </div>
        </details>
      )}

      <section aria-labelledby="chart-judul" className="mt-8 rounded-2xl border bg-card p-5 shadow-xs">
        <h2 id="chart-judul" className="text-lg font-semibold">Skor minat per bidang (0–100)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Skor menunjukkan seberapa tertarik kamu, bukan persentase kecocokan profesi. 0 berarti ketiga jawaban “Tidak tertarik”, 100 berarti ketiganya “Sangat tertarik”. Setiap bidang dihitung sendiri, jadi jumlahnya tidak harus 100.
        </p>
        <div className="mt-4">
          <HBarChart data={chartData} max={100} labelWidth={118} />
        </div>
      </section>

      <section aria-labelledby="semua-judul" className="mt-8">
        <h2 id="semua-judul" className="text-xl font-bold">Kenali semua bidang</h2>
        <div className="mt-3 grid gap-2">
          {sorted.map((s) => {
            const c = CATEGORY_BY_ID[s.id];
            return (
              <details key={s.id} className="group rounded-xl border bg-card">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: c.color }}>
                    <CategoryIcon id={c.id} className="size-4" />
                  </span>
                  <span className="flex-1 font-medium">{c.label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatScore(s.intensity)}/100</span>
                  <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t px-4 py-3 text-sm">
                  <p>{c.description}</p>
                  <p className="mt-2 text-muted-foreground">Contoh profesi: {c.professions.map((p) => p.name).join(", ")}.</p>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Simpan hasil ini dengan tangkapan layar jika perlu. Diskusikan bersama pemateri saat sesi sharing karier.
      </p>
    </Shell>
  );
}

function CategoryCard({ id, intensity, answers }: { id: CategoryId; intensity: number; answers: Record<string, number> }) {
  const c = CATEGORY_BY_ID[id];
  const reasons = categoryReasons(id, answers);
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex items-center gap-3 border-b p-4" style={{ background: `${c.color}14` }}>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: c.color }}>
          <CategoryIcon id={id} className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{c.label}</h3>
          <p className="text-sm text-muted-foreground">Skor minat: {formatScore(intensity)}/100</p>
        </div>
      </div>
      <div className="p-4">
        <p>{c.description}</p>
        <div className="mt-4 rounded-xl border border-dashed p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="size-4 text-primary" aria-hidden="true" /> Kenapa bidang ini muncul?
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">Jawabanmu untuk kegiatan di bidang ini:</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {reasons.map((r) => (
              <li key={r.questionId} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span>{r.text}</span>
                <span className="shrink-0 font-semibold">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contoh profesi</h4>
        <ul className="mt-2 grid gap-2">
          {c.professions.map((p) => (
            <li key={p.id} className="text-sm"><span className="font-semibold">{p.name}</span> — {p.description}</li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span><span className="font-semibold">Coba ini: </span>{c.tryActivity}</span>
        </p>
      </div>
    </article>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-3 sm:px-6">
        <Brand />
      </header>
      <main id="konten" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  );
}
