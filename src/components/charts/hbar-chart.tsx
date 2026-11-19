"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface HBarDatum {
  id: string;
  label: string;
  value: number; // sudah dalam satuan tampilan
  color: string;
  note?: string;
}

function fmt(n: number, decimals: number) {
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

/**
 * Bar chart horizontal dengan label nilai. Teks alternatif tersedia lewat
 * tabel yang dirender pemanggil; chart sendiri disembunyikan dari pembaca layar.
 */
export function HBarChart({
  data,
  max = 100,
  unit = "",
  decimals = 1,
  tooltipNote,
  labelWidth = 170,
}: {
  data: HBarDatum[];
  max?: number;
  unit?: string;
  decimals?: number;
  tooltipNote?: string;
  labelWidth?: number;
}) {
  const height = Math.max(160, data.length * 44 + 40);
  return (
    <div aria-hidden="true" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" domain={[0, max]} tickFormatter={(v: number) => `${fmt(v, 0)}${unit}`} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
          <YAxis type="category" dataKey="label" width={labelWidth} tick={{ fontSize: 13, fill: "var(--foreground)" }} interval={0} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(v) => [`${fmt(Number(v), decimals)}${unit}`, "Nilai"]}
            labelFormatter={(l, payload) => {
              const note = payload?.[0]?.payload?.note;
              return note ? `${l} — ${note}` : String(l);
            }}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}
            {...(tooltipNote ? { wrapperStyle: { maxWidth: 260 } } : {})}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              content={(props) => {
                // Label selalu tampil, termasuk untuk nilai 0.
                const x = Number(props.x ?? 0), y = Number(props.y ?? 0), w = Number(props.width ?? 0), h = Number(props.height ?? 0);
                return (
                  <text x={x + w + 6} y={y + h / 2} dominantBaseline="central" fontSize={13} fontWeight={600} fill="var(--foreground)">
                    {`${fmt(Number(props.value ?? 0), decimals)}${unit}`}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {tooltipNote && <span className="sr-only">{tooltipNote}</span>}
    </div>
  );
}
