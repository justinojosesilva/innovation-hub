"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { importUploadAction, type UploadState } from "./import-action";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending ? "Importando…" : "Importar"}
    </button>
  );
}

export function UploadForm() {
  const [state, action] = useActionState<UploadState, FormData>(importUploadAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        type="file"
        name="file"
        accept=".md,text/markdown"
        required
        className="block w-full text-sm text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/50 dark:file:text-indigo-300"
      />
      <div>
        <SubmitButton />
      </div>

      {state?.ok && state.status === "imported" && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Importado: {state.ideaCount} ideia{state.ideaCount === 1 ? "" : "s"} de{" "}
          <strong>{state.file}</strong>.
        </p>
      )}
      {state?.ok && state.status === "skipped" && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0" />
          <strong>{state.file}</strong> já estava importado — duplicata ignorada.
        </p>
      )}
      {state && !state.ok && (
        <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
    </form>
  );
}
