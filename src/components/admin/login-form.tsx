"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { loginAction, type FormState } from "@/app/actions/admin";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, null);
  return (
    <form action={action} className="mt-5 grid gap-4" noValidate>
      <div>
        <label htmlFor="pin" className="block font-semibold">PIN</label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="\d{6}"
          maxLength={6}
          required
          aria-invalid={state ? !state.ok : undefined}
          aria-describedby={state && !state.ok ? "pin-error" : undefined}
          className="mt-2 block min-h-12 w-full rounded-xl border border-input bg-background px-4 text-center font-mono text-xl tracking-[0.5em]"
        />
        {state && !state.ok && (
          <p id="pin-error" role="alert" className="mt-2 text-sm font-medium text-destructive">{state.message}</p>
        )}
      </div>
      <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70">
        {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />} Masuk
      </button>
    </form>
  );
}
