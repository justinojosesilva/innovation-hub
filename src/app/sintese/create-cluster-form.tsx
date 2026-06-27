"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import { createClusterAction, type CreateState } from "./actions";
import { IdeaCheckList } from "./idea-checklist";

type PickIdea = { id: string; title: string; category: string | null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      {pending ? "Criando…" : "Criar grupo"}
    </button>
  );
}

export function CreateClusterForm({ ideas }: { ideas: PickIdea[] }) {
  const [state, action] = useActionState<CreateState, FormData>(createClusterAction, null);
  return (
    <details className="mb-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:content-none">
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-indigo-500" /> Novo grupo manual
        </span>
      </summary>
      <form action={action} className="space-y-3 border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
        <input
          type="text"
          name="theme"
          placeholder="Nome do grupo (ex: Ferramentas de observabilidade)"
          className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700"
        />
        <IdeaCheckList ideas={ideas} />
        {state && !state.ok && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </p>
        )}
        <Submit />
      </form>
    </details>
  );
}
