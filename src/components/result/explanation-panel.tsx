"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { CATEGORY_BY_ID } from "@/config/questionnaire";
import type { ExplanationContent, ExplanationSource } from "@/lib/explanation/types";

interface Props {
  responseId: string;
  initial: { status: "success" | "pending" | "fallback"; source: ExplanationSource; content: ExplanationContent; retryable?: boolean };
  aiEnabled: boolean;
}

/**
 * Menampilkan penjelasan template segera; jika AI aktif dan belum ada cache,
 * meminta server membuat penjelasan (sekali, dengan polling terbatas bila
 * request lain sedang mengerjakannya).
 */
export function ExplanationPanel({ responseId, initial, aiEnabled }: Props) {
  const [source, setSource] = useState<ExplanationSource>(initial.source);
  const [content, setContent] = useState<ExplanationContent>(initial.content);
  const shouldFetch = aiEnabled && initial.status !== "success" && (initial.status === "pending" || initial.retryable);
  const [loading, setLoading] = useState<boolean>(Boolean(shouldFetch));
  const started = useRef(false);

  useEffect(() => {
    if (!shouldFetch || started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        try {
          const res = await fetch(`/api/hasil/${responseId}/penjelasan`, { method: "POST", cache: "no-store" });
          if (!res.ok) break;
          const data = (await res.json()) as { status: string; source: ExplanationSource; content: ExplanationContent | null };
          if (data.status === "success" && data.content) {
            if (!cancelled) {
              setContent(data.content);
              setSource("ai");
            }
            break;
          }
          if (data.status !== "pending") break;
        } catch {
          break;
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [responseId, shouldFetch]);

  return (
    <section aria-labelledby="penjelasan-judul" aria-busy={loading} className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="penjelasan-judul" className="text-lg font-semibold">Penjelasan hasilmu</h2>
        {source === "ai" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" /> Penjelasan dibantu AI
          </span>
        )}
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Menyiapkan penjelasan personal…
          </span>
        )}
      </div>
      <div aria-live="polite">
        <p className="mt-3 text-base leading-relaxed">{content.ringkasan}</p>
        {content.alasan.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {content.alasan.map((a) => (
              <li key={a.category_id} className="rounded-xl bg-muted/60 p-3 text-sm">
                <span className="font-semibold">{CATEGORY_BY_ID[a.category_id].label}: </span>
                {a.teks}
              </li>
            ))}
          </ul>
        )}
        {source === "ai" && content.profesi.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Profesi yang bisa kamu kenali lebih jauh</h3>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {content.profesi.map((p) => {
                const prof = CATEGORY_BY_ID[p.category_id].professions.find((x) => x.id === p.profession_id);
                return (
                  <li key={`${p.category_id}-${p.profession_id}`}>
                    <span className="font-semibold">{prof?.name}</span> — {p.alasan}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="mt-4 text-sm"><span className="font-semibold">Coba minggu ini: </span>{content.aktivitas_coba}</p>
      </div>
    </section>
  );
}
