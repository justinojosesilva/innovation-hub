"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { addIdeasAction } from "./actions";
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
      {pending ? "Adicionando…" : "Adicionar ao grupo"}
    </button>
  );
}

export function AddIdeasForm({
  clusterId,
  available,
}: {
  clusterId: string;
  available: PickIdea[];
}) {
  return (
    <details className="mt-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-neutral-500 marker:content-none">
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar ideias
        </span>
      </summary>
      <form action={addIdeasAction} className="space-y-3 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
        <input type="hidden" name="clusterId" value={clusterId} />
        <IdeaCheckList ideas={available} emptyText="Todas as ideias ativas já estão no grupo." />
        <Submit />
      </form>
    </details>
  );
}
