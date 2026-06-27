import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { getClusters } from "@/lib/synthesis";
import { ClusterForm } from "./cluster-form";

export const dynamic = "force-dynamic";
const hasKey = !!process.env.ANTHROPIC_API_KEY;

export default async function SintesePage() {
  const clusters = await getClusters();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sínteses</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Agrupa ideias por tema e compõe um sistema unificado a partir de cada grupo.
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <ClusterForm hasKey={hasKey} hasClusters={clusters.length > 0} />

      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <Sparkles className="mx-auto h-6 w-6 text-neutral-400" />
          <p className="mt-2 text-neutral-500">Nenhum grupo ainda.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Clique em “Analisar e agrupar” para a IA encontrar conjuntos de ideias que, juntas,
            viram um sistema maior.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clusters.map((c) => (
            <Link
              key={c.id}
              href={`/sintese/${c.id}`}
              className="group flex h-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md motion-reduce:hover:translate-y-0 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {c.theme}
                </span>
                {c.savedIdeaId ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> ideia
                  </span>
                ) : c.synthesizedAt ? (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    sintetizado
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-xs text-neutral-500">{c.rationale}</p>
              <div className="mt-auto flex flex-wrap gap-1">
                {c.ideas.slice(0, 4).map((i) => (
                  <span
                    key={i.id}
                    className="max-w-[160px] truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800"
                  >
                    {i.title}
                  </span>
                ))}
                {c.ideas.length > 4 && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400">
                    +{c.ideas.length - 4}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-0.5 text-xs text-neutral-400 group-hover:text-indigo-500">
                {c.ideas.length} ideias · abrir <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
