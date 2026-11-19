"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, RotateCcw } from "lucide-react";
import {
  EXPLORATION_STATUSES,
  INSTRUCTION,
  NAME_MAX,
  NAME_MIN,
  OTHER_INTEREST_MAX,
  REFLECTION_MAX,
  SCALE,
  STEPS,
  type ExplorationStatusId,
} from "@/config/questionnaire";
import { submitResponse } from "@/app/actions/submit";
import { cn } from "@/lib/utils";

interface Draft {
  submissionKey: string;
  name: string;
  classId: string;
  answers: Record<string, number>;
  explorationStatus: ExplorationStatusId | "";
  otherInterest: string;
  reflection: string;
  consent: boolean;
}

const DRAFT_KEY = "emk_draft_v1";
const TOTAL_STEPS = 6; // identitas, 4 langkah minat, tambahan + persetujuan

function newDraft(): Draft {
  return {
    submissionKey: crypto.randomUUID(),
    name: "",
    classId: "",
    answers: {},
    explorationStatus: "",
    otherInterest: "",
    reflection: "",
    consent: false,
  };
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return typeof d.submissionKey === "string" ? d : null;
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function Quiz({ classes }: { classes: { id: string; label: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Draft dipulihkan setelah mount agar render server dan klien sama.
    setDraft(loadDraft() ?? newDraft());
  }, []);

  useEffect(() => {
    if (draft && !done) saveDraft(draft);
  }, [draft, done]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  if (!draft) {
    return <div className="py-16 text-center text-muted-foreground" aria-busy="true">Menyiapkan kuis…</div>;
  }

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setAnswer = (id: string, v: number) => {
    update({ answers: { ...draft.answers, [id]: v } });
    setErrors((e) => {
      const { [id]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  };

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      const name = draft!.name.trim().replace(/\s+/g, " ");
      if (name.length < NAME_MIN) e.name = `Tulis namamu (minimal ${NAME_MIN} huruf).`;
      else if (name.length > NAME_MAX) e.name = `Nama maksimal ${NAME_MAX} karakter.`;
      else if (!/^[\p{L}\p{M}][\p{L}\p{M} .,'’\-]*$/u.test(name)) e.name = "Gunakan huruf, spasi, titik, koma, apostrof, atau tanda hubung.";
      if (!draft!.classId) e.classId = "Pilih kelasmu.";
    } else if (s >= 1 && s <= 4) {
      for (const q of STEPS[s - 1]) if (!draft!.answers[q.id]) e[q.id] = "Pilih salah satu jawaban.";
    } else if (s === 5) {
      if (!draft!.explorationStatus) e.explorationStatus = "Pilih salah satu.";
      if (draft!.otherInterest.length > OTHER_INTEREST_MAX) e.otherInterest = `Maksimal ${OTHER_INTEREST_MAX} karakter.`;
      if (draft!.reflection.length > REFLECTION_MAX) e.reflection = `Maksimal ${REFLECTION_MAX} karakter.`;
      if (!draft!.consent) e.consent = "Centang persetujuan sebelum mengirim.";
    }
    return e;
  }

  function focusFirstError(e: Record<string, string>) {
    const first = Object.keys(e)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"] textarea`);
      el?.focus();
    });
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    for (let s = 0; s < TOTAL_STEPS; s++) {
      const e = validateStep(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        if (s === step) focusFirstError(e);
        return;
      }
    }
    setSubmitError(null);
    startTransition(async () => {
      try {
        const res = await submitResponse({
          submissionKey: draft!.submissionKey,
          name: draft!.name,
          classId: draft!.classId,
          consent: draft!.consent,
          answers: draft!.answers,
          explorationStatus: draft!.explorationStatus,
          otherInterest: draft!.otherInterest,
          reflection: draft!.reflection,
        });
        if (res.ok) {
          setDone(true);
          clearDraft();
          router.push(`/hasil/${res.responseId}`);
          return;
        }
        setSubmitError(res.message);
        if (res.fieldErrors) setErrors(res.fieldErrors);
        if (res.fieldErrors?.classId) setStep(0);
      } catch {
        setSubmitError("Koneksi terputus sehingga jawaban belum tersimpan. Jawabanmu masih ada; coba kirim lagi.");
      }
    });
  }

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const stepTitle =
    step === 0 ? "Kenalan dulu" : step <= 4 ? `Bagian ${step} dari 4` : "Sedikit lagi";

  return (
    <div className="pt-2">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Langkah {step + 1} dari {TOTAL_STEPS}</span>
          {step >= 1 && step <= 4 && (
            <span>{Object.keys(draft.answers).length} dari 24 terjawab</span>
          )}
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progres kuis"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold tracking-tight outline-none sm:text-3xl">
        {stepTitle}
      </h1>

      <div key={step} className="emk-rise mt-4">
        {step === 0 && (
          <IdentityStep draft={draft} classes={classes} errors={errors} update={update} />
        )}
        {step >= 1 && step <= 4 && (
          <QuestionStep stepIndex={step - 1} answers={draft.answers} errors={errors} onAnswer={setAnswer} />
        )}
        {step === 5 && <ExtraStep draft={draft} errors={errors} update={update} />}
      </div>

      {submitError && (
        <div role="alert" className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
          <p className="font-medium">{submitError}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={back} disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-card px-5 font-semibold hover:bg-muted disabled:opacity-50">
            <ArrowLeft className="size-5" aria-hidden="true" /> Kembali
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button type="button" onClick={next} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
            Lanjut <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
          >
            {pending ? (
              <><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Menyimpan…</>
            ) : submitError ? (
              <><RotateCcw className="size-5" aria-hidden="true" /> Coba kirim lagi</>
            ) : (
              <><Check className="size-5" aria-hidden="true" /> Kirim dan lihat hasil</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function IdentityStep({
  draft,
  classes,
  errors,
  update,
}: {
  draft: Draft;
  classes: { id: string; label: string }[];
  errors: Record<string, string>;
  update: (p: Partial<Draft>) => void;
}) {
  return (
    <div className="grid gap-6">
      <div data-field="name">
        <label htmlFor="nama" className="block text-base font-semibold">Nama</label>
        <input
          id="nama"
          type="text"
          autoComplete="name"
          maxLength={NAME_MAX}
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "nama-error" : undefined}
          className="mt-2 block min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base aria-invalid:border-destructive"
        />
        <FieldError id="nama-error" message={errors.name} />
      </div>
      <div data-field="classId">
        <label htmlFor="kelas" className="block text-base font-semibold">Kelas</label>
        <select
          id="kelas"
          value={draft.classId}
          onChange={(e) => update({ classId: e.target.value })}
          aria-invalid={Boolean(errors.classId)}
          aria-describedby={errors.classId ? "kelas-error" : undefined}
          className="mt-2 block min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base aria-invalid:border-destructive"
        >
          <option value="">Pilih kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {classes.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Belum ada kelas aktif. Hubungi pemateri.</p>}
        <FieldError id="kelas-error" message={errors.classId} />
      </div>
      <p className="rounded-xl bg-secondary/70 p-4 text-sm text-secondary-foreground">
        Nama, kelas, dan jawabanmu akan disimpan agar bisa dilihat pemateri. Kamu akan diminta menyetujuinya sebelum mengirim.
      </p>
    </div>
  );
}

function QuestionStep({
  stepIndex,
  answers,
  errors,
  onAnswer,
}: {
  stepIndex: number;
  answers: Record<string, number>;
  errors: Record<string, string>;
  onAnswer: (id: string, v: number) => void;
}) {
  return (
    <div>
      <p className="text-base text-muted-foreground">{INSTRUCTION}</p>
      <ol className="mt-6 grid gap-6">
        {STEPS[stepIndex].map((q) => {
          const err = errors[q.id];
          return (
            <li key={q.id} data-field={q.id}>
              <fieldset
                className={cn("rounded-2xl border bg-card p-4 shadow-xs sm:p-5", err && "border-destructive")}
                aria-describedby={err ? `${q.id}-error` : undefined}
              >
                <legend className="sr-only">Pernyataan {q.number}: {q.text}</legend>
                <p aria-hidden="true" className="text-base font-semibold leading-snug sm:text-lg">
                  <span className="mr-2 text-muted-foreground">{q.number}.</span>
                  {q.text}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {SCALE.map((s) => {
                    const checked = answers[q.id] === s.value;
                    return (
                      <label
                        key={s.value}
                        className={cn(
                          "relative flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm font-medium transition sm:flex-col sm:justify-center sm:gap-1 sm:text-center",
                          "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
                          checked ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background hover:border-primary/50",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={s.value}
                          checked={checked}
                          onChange={() => onAnswer(q.id, s.value)}
                          aria-label={`${s.value}, ${s.label}`}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
                            checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                          )}
                        >
                          {s.value}
                        </span>
                        <span>{s.label}</span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id={`${q.id}-error`} message={err} />
              </fieldset>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ExtraStep({ draft, errors, update }: { draft: Draft; errors: Record<string, string>; update: (p: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-6">
      <fieldset data-field="explorationStatus" className={cn("rounded-2xl border bg-card p-4 sm:p-5", errors.explorationStatus && "border-destructive")}
        aria-describedby={errors.explorationStatus ? "status-error" : undefined}>
        <legend className="px-1 text-base font-semibold">Seberapa jauh kamu sudah memikirkan bidang kerja? <span className="font-normal text-muted-foreground">(wajib)</span></legend>
        <div className="mt-3 grid gap-2">
          {EXPLORATION_STATUSES.map((s) => {
            const checked = draft.explorationStatus === s.id;
            return (
              <label key={s.id} className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2 text-base font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring",
                checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              )}>
                <input type="radio" name="explorationStatus" value={s.id} checked={checked} onChange={() => update({ explorationStatus: s.id })} className="size-5 accent-[var(--primary)]" />
                {s.label}
              </label>
            );
          })}
        </div>
        <FieldError id="status-error" message={errors.explorationStatus} />
      </fieldset>

      <div data-field="otherInterest">
        <label htmlFor="lainnya" className="block text-base font-semibold">
          Ada bidang atau profesi lain yang menarik untukmu? <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea id="lainnya" rows={2} maxLength={OTHER_INTEREST_MAX} value={draft.otherInterest}
          onChange={(e) => update({ otherInterest: e.target.value })}
          aria-describedby="lainnya-hint"
          className="mt-2 block w-full rounded-xl border border-input bg-card px-4 py-3 text-base" />
        <p id="lainnya-hint" className="mt-1 text-right text-sm text-muted-foreground">{draft.otherInterest.length}/{OTHER_INTEREST_MAX}</p>
        <FieldError id="lainnya-error" message={errors.otherInterest} />
      </div>

      <div data-field="reflection">
        <label htmlFor="refleksi" className="block text-base font-semibold">
          Aktivitas apa yang paling ingin kamu coba, dan kenapa? <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea id="refleksi" rows={4} maxLength={REFLECTION_MAX} value={draft.reflection}
          onChange={(e) => update({ reflection: e.target.value })}
          aria-describedby="refleksi-hint"
          className="mt-2 block w-full rounded-xl border border-input bg-card px-4 py-3 text-base" />
        <p id="refleksi-hint" className="mt-1 text-right text-sm text-muted-foreground">{draft.reflection.length}/{REFLECTION_MAX}</p>
        <FieldError id="refleksi-error" message={errors.reflection} />
      </div>

      <div data-field="consent" className={cn("rounded-2xl border-2 bg-secondary/60 p-4 sm:p-5", errors.consent ? "border-destructive" : "border-transparent")}>
        <h2 className="font-semibold">Sebelum mengirim</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Nama, kelas, dan semua jawabanmu disimpan dan dapat dilihat pemateri. Data ini tidak anonim.</li>
        </ul>
        <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-base font-medium">
          <input type="checkbox" checked={draft.consent} onChange={(e) => update({ consent: e.target.checked })}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-[var(--primary)]" />
          Saya mengerti dan setuju jawaban saya disimpan untuk dilihat pemateri.
        </label>
        <FieldError id="consent-error" message={errors.consent} />
      </div>
    </div>
  );
}
