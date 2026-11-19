"use client";

import { useActionState } from "react";
import { addClassAction, renameClassAction, type FormState } from "@/app/actions/admin";

export function AddClassForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addClassAction, null);
  return (
    <form action={action} className="rounded-2xl border bg-card p-4">
      <label htmlFor="kelas-baru" className="font-semibold">Tambah kelas</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="kelas-baru" name="label" required minLength={2} maxLength={60} placeholder="mis. XII RPL 3"
          className="min-h-11 flex-1 rounded-lg border border-input bg-background px-3" />
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-70">Tambah</button>
      </div>
      {state && <p role="status" className={`mt-2 text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>{state.message}</p>}
    </form>
  );
}

export function RenameClassForm({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameClassAction, null);
  return (
    <form action={action} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-48 flex-1">
        <label htmlFor={`rename-${id}`} className="text-sm text-muted-foreground">Ubah label</label>
        <input id={`rename-${id}`} name="label" defaultValue={label} required minLength={2} maxLength={60}
          className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-3" />
      </div>
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-70">Simpan</button>
      {state && <p role="status" className={`w-full text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>{state.message}</p>}
    </form>
  );
}
