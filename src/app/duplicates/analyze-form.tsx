"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { runAnalysis, type AnalyzeState } from "./actions";

function SubmitButton({ hasKey, hasPairs }: { hasKey: boolean; hasPairs: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hasKey}
      aria-busy={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending ? "Analisando…" : hasPairs ? "Reanalisar" : "Analisar duplicatas"}
    </button>
  );
}

export function AnalyzeForm({ hasKey, hasPairs }: { hasKey: boolean; hasPairs: boolean }) {
  const [state, action] = useActionState<AnalyzeState, FormData>(runAnalysis, null);

  return (
    <form action={action} className="mb-8">
      <SubmitButton hasKey={hasKey} hasPairs={hasPairs} />
      {!hasKey && (
        <p className="mt-2 text-xs text-rose-500">
          Configure ANTHROPIC_API_KEY no .env para rodar a análise.
        </p>
      )}
      {state?.ok && (
        <div className="mt-2 space-y-2">
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {state.pairsFound} par{state.pairsFound === 1 ? "" : "es"} em {state.analyzed} ideias
            {state.batches > 1 ? ` · ${state.batches} lotes` : ""}.
          </p>
          {state.skipped > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {state.skipped} lote{state.skipped === 1 ? "" : "s"} truncou e foi pulado — reanalise para cobri-lo.
            </p>
          )}
        </div>
      )}
      {state && !state.ok && (
        <p className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
    </form>
  );
}
