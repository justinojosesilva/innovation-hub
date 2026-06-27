import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, CheckCircle2, ExternalLink, Hand, X, Trash2 } from "lucide-react";
import { getCluster, getPickableIdeas } from "@/lib/synthesis";
import { SubmitButton } from "@/app/_components/submit-button";
import {
  synthesizeClusterAction,
  saveAsIdeaAction,
  removeIdeaAction,
  deleteClusterAction,
} from "../actions";
import { AddIdeasForm } from "../add-ideas-form";

export const dynamic = "force-dynamic";
const hasKey = !!process.env.ANTHROPIC_API_KEY;

const SCORE_LABELS: [string, string][] = [
  ["monetizacao", "Monet."],
  ["implementacao", "Implem."],
  ["stackFit", "Stack"],
  ["tendencia", "Tend."],
  ["diferencial", "Difer."],
];

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cluster, pickable] = await Promise.all([getCluster(id), getPickableIdeas()]);
  if (!cluster) notFound();

  const synthesized = !!cluster.synthesizedAt;
  const scores = (cluster.synthScores ?? {}) as Record<string, number | null>;
  const memberIds = new Set(cluster.ideas.map((i) => i.id));
  const available = pickable.filter((i) => !memberIds.has(i.id));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/sintese" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
        ← sínteses
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{cluster.theme}</h1>
          {cluster.manual && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Hand className="h-3 w-3" /> curado à mão
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">{cluster.rationale}</p>
      </header>

      {/* member ideas */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Ideias do grupo ({cluster.ideas.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {cluster.ideas.map((i) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 py-1 pl-3 pr-1 text-sm dark:border-neutral-700"
            >
              <Link
                href={`/ideas/${i.id}`}
                className="text-neutral-600 underline-offset-4 hover:text-indigo-600 dark:text-neutral-300"
              >
                {i.title}
              </Link>
              <form action={removeIdeaAction}>
                <input type="hidden" name="clusterId" value={cluster.id} />
                <input type="hidden" name="ideaId" value={i.id} />
                <button
                  type="submit"
                  aria-label={`Remover ${i.title} do grupo`}
                  className="rounded-full p-0.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </span>
          ))}
          {cluster.ideas.length === 0 && (
            <p className="text-sm text-neutral-400">Grupo vazio — adicione ideias abaixo.</p>
          )}
        </div>
        <AddIdeasForm clusterId={cluster.id} available={available} />
      </section>

      {/* synthesis */}
      {!synthesized ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center dark:border-neutral-700">
          <Sparkles className="mx-auto h-6 w-6 text-neutral-400" />
          <p className="mt-2 text-neutral-500">Sistema unificado ainda não gerado.</p>
          <form action={synthesizeClusterAction} className="mt-4">
            <input type="hidden" name="clusterId" value={cluster.id} />
            <SubmitButton
              disabled={!hasKey || cluster.ideas.length < 2}
              pendingText="Sintetizando…"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Sintetizar sistema
            </SubmitButton>
          </form>
        </div>
      ) : (
        <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                Sistema unificado
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{cluster.synthName}</h2>
            </div>
            {/* scores */}
            <div className="flex flex-wrap gap-1.5">
              {SCORE_LABELS.map(([key, label]) => (
                <span
                  key={key}
                  className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-500 dark:bg-neutral-800"
                >
                  {label} {scores[key] ?? "—"}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{cluster.synthValueProp}</p>

          {cluster.synthDifferential && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Diferencial</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{cluster.synthDifferential}</p>
            </div>
          )}

          {cluster.synthFeatures.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Funcionalidades combinadas
              </p>
              <ul className="space-y-1">
                {cluster.synthFeatures.map((f, i) => (
                  <li key={i} className="flex gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="text-indigo-400">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cluster.synthMvp && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">MVP</p>
              <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-400">{cluster.synthMvp}</p>
            </div>
          )}

          {/* actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {cluster.savedIdeaId ? (
              <Link
                href={`/ideas/${cluster.savedIdeaId}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <CheckCircle2 className="h-4 w-4" /> Ver ideia criada
              </Link>
            ) : (
              <form action={saveAsIdeaAction}>
                <input type="hidden" name="clusterId" value={cluster.id} />
                <SubmitButton
                  pendingText="Salvando…"
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Salvar como ideia
                </SubmitButton>
              </form>
            )}
            <form action={synthesizeClusterAction}>
              <input type="hidden" name="clusterId" value={cluster.id} />
              <SubmitButton
                disabled={!hasKey}
                pendingText="Sintetizando…"
                className="rounded-md px-3 py-2 text-sm text-neutral-500 underline-offset-4 hover:underline"
              >
                Regenerar síntese
              </SubmitButton>
            </form>
            {cluster.savedIdeaId && (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                <ExternalLink className="h-3 w-3" /> já virou uma ideia no catálogo
              </span>
            )}
          </div>
        </section>
      )}

      <form action={deleteClusterAction} className="mt-8">
        <input type="hidden" name="clusterId" value={cluster.id} />
        <SubmitButton
          pendingText="Excluindo…"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 underline-offset-4 hover:text-rose-500 hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir grupo
        </SubmitButton>
      </form>
    </main>
  );
}
