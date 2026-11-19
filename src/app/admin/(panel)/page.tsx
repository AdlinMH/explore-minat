import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Download, FileSpreadsheet, Filter, RotateCcw, Search } from "lucide-react";
import { HBarChart } from "@/components/charts/hbar-chart";
import { CATEGORIES, CATEGORY_BY_ID, EXPLORATION_LABEL, type CategoryId } from "@/config/questionnaire";
import { requireAdmin } from "@/server/admin-auth";
import { getOtherInterests, getStatRows, getTablePage, listAllClasses } from "@/server/admin-data";
import { parseFilters, type Filters } from "@/lib/validation";
import { averageIntensity, categoryLabel, explorationSummary, otherInterestCount, perClassAverages, primaryDistribution, UNDIFFERENTIATED } from "@/lib/stats";
import { roundOne } from "@/lib/scoring";

export const metadata: Metadata = { title: "Dashboard pemateri" };

const dateFmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
const n1 = (v: number) => roundOne(v).toLocaleString("id-ID", { maximumFractionDigits: 1 });

function qs(f: Filters, patch: Partial<Filters> = {}) {
  const merged = { ...f, ...patch };
  const p = new URLSearchParams();
  if (merged.kelas) p.set("kelas", merged.kelas);
  if (merged.dari) p.set("dari", merged.dari);
  if (merged.sampai) p.set("sampai", merged.sampai);
  if (merged.cari) p.set("cari", merged.cari);
  if (merged.hal && merged.hal > 1) p.set("hal", String(merged.hal));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const filters = parseFilters(await searchParams);
  const [classes, statRows, table, others] = await Promise.all([
    listAllClasses(),
    getStatRows(filters),
    getTablePage(filters),
    getOtherInterests(filters),
  ]);

  const total = statRows.length;
  const classesWithResponses = new Set(statRows.map((r) => r.classId)).size;
  const exploration = explorationSummary(statRows);
  const unknownCount = exploration.find((e) => e.id === "belum_tahu")?.count ?? 0;
  const otherCount = otherInterestCount(statRows);
  const averages = averageIntensity(statRows);
  const dist = primaryDistribution(statRows);
  const perClass = perClassAverages(statRows, classes);
  const activeClass = classes.find((c) => c.id === filters.kelas);
  const hasBaseFilter = Boolean(filters.kelas || filters.dari || filters.sampai);
  const hasAnyFilter = hasBaseFilter || Boolean(filters.cari);

  const avgData = CATEGORIES.map((c) => ({ id: c.id, label: c.shortLabel, value: roundOne(averages[c.id]), color: c.color }));
  const distData = dist.items.map((d) => ({
    id: d.id,
    label: d.id === UNDIFFERENTIATED ? "Belum terbedakan" : CATEGORY_BY_ID[d.id as CategoryId].shortLabel,
    value: roundOne(d.percent),
    color: d.id === UNDIFFERENTIATED ? "#94a3b8" : CATEGORY_BY_ID[d.id as CategoryId].color,
    note: `${n1(d.weight)} dari ${dist.total} respons (bobot seri 1/k)`,
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard minat kelas</h1>
          <p className="text-sm text-muted-foreground">Semua waktu dalam WIB (Asia/Jakarta). Satu baris = satu respons; nama tidak diverifikasi sebagai identitas unik.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/ekspor/excel${qs({ ...filters, hal: undefined })}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
            <FileSpreadsheet className="size-4" aria-hidden="true" /> Ekspor Excel (.xlsx)
          </a>
          <a href={`/admin/ekspor${qs({ ...filters, hal: undefined })}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 font-semibold hover:bg-muted">
            <Download className="size-4" aria-hidden="true" /> Ekspor CSV
          </a>
        </div>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto]" aria-label="Filter data">
        <div>
          <label htmlFor="f-kelas" className="text-sm font-semibold">Kelas</label>
          <select id="f-kelas" name="kelas" defaultValue={filters.kelas ?? ""} className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3">
            <option value="">Semua kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.label}{c.is_active ? "" : " (nonaktif)"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-dari" className="text-sm font-semibold">Dari tanggal</label>
          <input id="f-dari" type="date" name="dari" defaultValue={filters.dari ?? ""} className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" />
        </div>
        <div>
          <label htmlFor="f-sampai" className="text-sm font-semibold">Sampai tanggal</label>
          <input id="f-sampai" type="date" name="sampai" defaultValue={filters.sampai ?? ""} className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" />
        </div>
        <div>
          <label htmlFor="f-cari" className="text-sm font-semibold">Cari nama <span className="font-normal text-muted-foreground">(hanya tabel &amp; ekspor)</span></label>
          <input id="f-cari" type="search" name="cari" defaultValue={filters.cari ?? ""} maxLength={100} className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
            <Filter className="size-4" aria-hidden="true" /> Terapkan
          </button>
          <Link href="/admin" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 font-semibold hover:bg-muted">
            <RotateCcw className="size-4" aria-hidden="true" /> Reset
          </Link>
        </div>
        {hasAnyFilter && (
          <p className="text-sm sm:col-span-2 lg:col-span-5" role="status">
            <span className="font-semibold">Filter aktif:</span>{" "}
            {[
              activeClass && `kelas ${activeClass.label}`,
              filters.dari && `dari ${filters.dari}`,
              filters.sampai && `sampai ${filters.sampai}`,
              filters.cari && `nama mengandung “${filters.cari}” (tabel & ekspor saja)`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
      </form>

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Respons terkirim" value={total} />
        <Kpi label="Kelas yang memiliki respons" value={classesWithResponses} />
        <Kpi label="Status “Masih belum tahu”" value={unknownCount} />
        <Kpi label="Mengisi minat lainnya" value={otherCount} />
      </section>

      {total === 0 && (
        <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">
          {hasBaseFilter ? "Belum ada respons yang cocok dengan filter ini." : "Belum ada respons. Angka dan chart akan terisi setelah siswa mengirim kuis."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Rata-rata intensitas minat per bidang"
          subtitle={`Skala 0–100 dari ${total} respons. Setiap bidang dihitung terpisah, jadi totalnya tidak 100.`}
        >
          <HBarChart data={avgData} max={100} labelWidth={118} />
          <AltTable caption="Rata-rata intensitas minat" headers={["Bidang", "Rata-rata (0–100)"]}
            rows={CATEGORIES.map((c) => [c.label, n1(averages[c.id])])} />
        </ChartCard>
        <ChartCard
          title="Distribusi minat utama"
          subtitle={`Persentase dari ${total} respons. Jika k bidang seri tertinggi, masing-masing mendapat bobot 1/k. Respons dengan semua skor sama masuk “Belum terbedakan”. Berbeda dari status “Masih belum tahu”.`}
        >
          <HBarChart data={distData} max={100} unit="%" labelWidth={128} tooltipNote="Bobot seri 1/k" />
          <AltTable caption="Distribusi minat utama" headers={["Bidang", "Bobot respons", "Persen"]}
            rows={dist.items.map((d) => [categoryLabel(d.id), n1(d.weight), `${n1(d.percent)}%`])} />
        </ChartCard>
      </div>

      <ChartCard title="Perbandingan rata-rata minat per kelas" subtitle="Heatmap rata-rata intensitas (0–100). Warna lebih pekat = rata-rata lebih tinggi; angka selalu ditampilkan.">
        {perClass.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data kelas untuk dibandingkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
              <caption className="sr-only">Rata-rata minat per kelas</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2 text-left">Kelas (jumlah respons)</th>
                  {CATEGORIES.map((c) => <th key={c.id} scope="col" className="p-2 text-center font-medium">{c.shortLabel}</th>)}
                </tr>
              </thead>
              <tbody>
                {perClass.map((pc) => (
                  <tr key={pc.classId}>
                    <th scope="row" className="whitespace-nowrap p-2 text-left font-semibold">{pc.label} <span className="font-normal text-muted-foreground">({pc.count})</span></th>
                    {CATEGORIES.map((c) => {
                      const v = pc.averages[c.id];
                      return (
                        <td key={c.id} className="rounded-md p-2 text-center font-semibold tabular-nums"
                          style={{ background: `color-mix(in oklch, #0f766e ${Math.round(8 + v * 0.62)}%, white)`, color: v > 60 ? "white" : "var(--foreground)" }}>
                          {n1(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Status eksplorasi" subtitle="Jumlah respons per status. Penanda ini terpisah dari chart bidang.">
          <ul className="grid gap-2">
            {exploration.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <span>{e.label}</span>
                <span className="font-semibold tabular-nums">{e.count}{total > 0 ? ` (${n1((e.count / total) * 100)}%)` : ""}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Isian bidang/profesi lainnya" subtitle={`${otherCount} respons mengisi. Menampilkan maksimal 100 terbaru.`}>
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada isian lainnya.</p>
          ) : (
            <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1">
              {others.map((o) => (
                <li key={o.id} className="rounded-lg border p-3 text-sm">
                  <p className="whitespace-pre-wrap break-words">{o.other_interest}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{o.name} · {o.class_label}</p>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <section aria-labelledby="tabel-judul" className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tabel-judul" className="text-lg font-semibold">Daftar respons</h2>
          <p className="text-sm text-muted-foreground">
            <Search className="mr-1 inline size-4" aria-hidden="true" />
            {table.total} respons{filters.cari ? " (termasuk pencarian nama)" : ""}
          </p>
        </div>
        {table.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Tidak ada respons untuk ditampilkan.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Nama</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Kelas</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Waktu (WIB)</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Minat tertinggi</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status eksplorasi</th>
                  <th scope="col" className="py-2 font-medium"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">{r.class_label}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{dateFmt.format(r.created_at)}</td>
                    <td className="py-2 pr-3">
                      {r.result_pattern === "normal" ? r.highest_category_ids.map(categoryLabel).join(" / ") : <span className="text-muted-foreground">Belum terbedakan</span>}
                      {r.highest_category_ids.length > 1 && <span className="ml-1 text-xs text-muted-foreground">(seri)</span>}
                    </td>
                    <td className="py-2 pr-3">{EXPLORATION_LABEL[r.exploration_status]}</td>
                    <td className="py-2 text-right">
                      <Link href={`/admin/responden/${r.id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-primary hover:bg-secondary">
                        Detail<span className="sr-only"> {r.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {table.pageCount > 1 && (
          <nav aria-label="Halaman tabel" className="mt-3 flex items-center justify-between gap-2 text-sm">
            {table.page > 1 ? (
              <Link href={`/admin${qs(filters, { hal: table.page - 1 })}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold hover:bg-muted">Sebelumnya</Link>
            ) : <span />}
            <span>Halaman {table.page} dari {table.pageCount}</span>
            {table.page < table.pageCount ? (
              <Link href={`/admin${qs(filters, { hal: table.page + 1 })}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold hover:bg-muted">Berikutnya</Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AltTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary">
        Lihat sebagai tabel <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {headers.map((h, i) => <th key={h} scope="col" className={`py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[0])} className="border-b last:border-0">
              {r.map((cell, i) => i === 0
                ? <th key={i} scope="row" className="py-1.5 text-left font-medium">{cell}</th>
                : <td key={i} className="py-1.5 text-right tabular-nums">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
