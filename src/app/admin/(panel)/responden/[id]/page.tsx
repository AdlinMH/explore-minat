import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HBarChart } from "@/components/charts/hbar-chart";
import { ScoreTable } from "@/components/result/score-table";
import { CATEGORY_BY_ID, EXPLORATION_LABEL, QUESTIONS, SCALE } from "@/config/questionnaire";
import { requireAdmin } from "@/server/admin-auth";
import { getResponseForAdmin } from "@/server/responses";
import { roundOne, scoresFromRecord, sortByScore } from "@/lib/scoring";
import { categoryLabel } from "@/lib/stats";

export const metadata: Metadata = { title: "Detail respons" };

const dateFmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

export default async function DetailPage({ params }: PageProps<"/admin/responden/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const row = await getResponseForAdmin(id);
  if (!row) notFound();

  const cats = scoresFromRecord(row.scores);
  const chart = cats.map((c) => ({ id: c.id, label: CATEGORY_BY_ID[c.id].shortLabel, value: roundOne(c.intensity), color: CATEGORY_BY_ID[c.id].color }));
  const scaleLabel = (v: number) => SCALE.find((s) => s.value === v)?.label ?? "—";

  return (
    <div className="grid gap-6">
      <Link href="/admin" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 font-semibold text-primary hover:bg-secondary">
        <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{row.name}</h1>
        <p className="text-muted-foreground">{row.class_label} · {dateFmt.format(row.created_at)} WIB · versi kuesioner {row.questionnaire_version}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Skor minat per bidang (0–100)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Minat tertinggi: {row.result_pattern === "normal" ? row.highest_category_ids.map(categoryLabel).join(" / ") : "Belum terbedakan"}
            {row.top_category_ids.length > 0 && <> · Peringkat 3 teratas: {row.top_category_ids.map(categoryLabel).join(", ")}</>}
          </p>
          <div className="mt-3"><HBarChart data={chart} max={100} labelWidth={118} /></div>
          <ScoreTable rows={sortByScore(cats)} caption="Skor minat per bidang" />
        </section>
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Pertanyaan tambahan</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <div><dt className="text-muted-foreground">Status eksplorasi</dt><dd className="font-semibold">{EXPLORATION_LABEL[row.exploration_status]}</dd></div>
            <div><dt className="text-muted-foreground">Bidang/profesi lainnya</dt><dd className="whitespace-pre-wrap break-words">{row.other_interest ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Aktivitas yang paling ingin dicoba dan alasannya</dt><dd className="whitespace-pre-wrap break-words">{row.reflection ?? "—"}</dd></div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Jawaban 24 pernyataan</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">No.</th>
                <th scope="col" className="py-2 pr-3 font-medium">Pernyataan</th>
                <th scope="col" className="py-2 pr-3 font-medium">Bidang</th>
                <th scope="col" className="py-2 font-medium">Jawaban</th>
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((q) => (
                <tr key={q.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 tabular-nums">{q.number}</td>
                  <td className="py-2 pr-3">{q.text}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{CATEGORY_BY_ID[q.category].shortLabel}</td>
                  <td className="py-2 whitespace-nowrap font-semibold">{row.answers[q.id]} · {scaleLabel(row.answers[q.id])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
