import { CATEGORY_BY_ID, type CategoryId } from "@/config/questionnaire";
import { formatScore } from "@/lib/scoring";

export function ScoreTable({ rows, caption }: { rows: { id: CategoryId; raw: number; intensity: number }[]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th scope="col" className="py-2 pr-2 font-medium">Bidang</th>
          <th scope="col" className="py-2 pr-2 text-right font-medium">Skor minat (0–100)</th>
          <th scope="col" className="py-2 text-right font-medium">Jumlah 3 jawaban</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b last:border-0">
            <th scope="row" className="py-2 pr-2 text-left font-medium">{CATEGORY_BY_ID[r.id].label}</th>
            <td className="py-2 pr-2 text-right tabular-nums">{formatScore(r.intensity)}</td>
            <td className="py-2 text-right tabular-nums">{r.raw} dari 15</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
