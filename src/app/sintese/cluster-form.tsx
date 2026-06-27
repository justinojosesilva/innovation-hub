"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { runClustering, type ClusterState } from "./actions";

function SubmitButton({ hasKey, hasClusters }: { hasKey: boolean; hasClusters: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hasKey}
      aria-busy={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending ? "Agrupando…" : hasClusters ? "Reagrupar" : "Analisar e agrupar"}
    </button>
  );
}

export function ClusterForm({ hasKey, hasClusters }: { hasKey: boolean; hasClusters: boolean }) {
  const [state, action] = useActionState<ClusterState, FormData>(runClustering, null);
  return (
    <form action={action} className="mb-6">
      <SubmitButton hasKey={hasKey} hasClusters={hasClusters} />
      {!hasKey && (
        <p className="mt-2 text-xs text-rose-500">Configure ANTHROPIC_API_KEY no .env.</p>
      )}
      {state?.ok && (
        <p className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.clusters} grupo{state.clusters === 1 ? "" : "s"} em {state.analyzed} ideias.
        </p>
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
