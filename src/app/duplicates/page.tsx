import Link from "next/link";
import { getDuplicatePairs } from "@/lib/dedup";
import { mergePair, dismissPair } from "./actions";
import { AnalyzeForm } from "./analyze-form";

export const dynamic = "force-dynamic";

const REC_STYLE: Record<string, string> = {
  MERGE: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  RELATED: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  DISTINCT: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const REC_LABEL: Record<string, string> = {
  MERGE: "Mesclar",
  RELATED: "Relacionadas",
  DISTINCT: "Distintas",
};

function simTone(s: number): string {
  return s >= 80
    ? "text-rose-600 dark:text-rose-400"
    : s >= 65
    ? "text-amber-600 dark:text-amber-400"
    : "text-neutral-500";
}

const hasKey = !!process.env.ANTHROPIC_API_KEY;

export default async function DuplicatesPage() {
  const pairs = await getDuplicatePairs();
  const open = pairs.filter((p) => p.status === "open");
  const resolved = pairs.filter((p) => p.status !== "open");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detecção de Duplicatas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ideias semanticamente parecidas, avaliadas por IA (Claude).
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <AnalyzeForm hasKey={hasKey} hasPairs={pairs.length > 0} />

      {open.length === 0 && resolved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-500">Nenhuma duplicata detectada ainda.</p>
          <p className="mt-2 text-sm text-neutral-400">
            Clique em “Analisar duplicatas” para a IA comparar as ideias do catálogo.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section className="space-y-3">
              {open.map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className={`text-2xl font-semibold tabular-nums ${simTone(p.similarity)}`}>
                      {p.similarity}%
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        REC_STYLE[p.recommendation] ?? ""
                      }`}
                    >
                      {REC_LABEL[p.recommendation] ?? p.recommendation}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                    <Link href={`/ideas/${p.ideaA.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.ideaA.title}
                    </Link>
                    <span className="text-neutral-400">↔</span>
                    <Link href={`/ideas/${p.ideaB.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.ideaB.title}
                    </Link>
                  </div>

                  <p className="mt-2 text-sm text-neutral-500">{p.rationale}</p>

                  <div className="mt-3 flex gap-2">
                    <form action={mergePair}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                      >
                        Mesclar (manter a de maior score)
                      </button>
                    </form>
                    <form action={dismissPair}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-md px-3 py-1.5 text-xs text-neutral-500 underline-offset-4 hover:underline"
                      >
                        Manter separadas
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Resolvidas
              </h2>
              <ul className="space-y-2">
                {resolved.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800"
                  >
                    <span className="truncate">
                      {p.ideaA.title} ↔ {p.ideaB.title}
                    </span>
                    <span className="ml-3 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                      {p.status === "merged" ? "mesclada" : "mantida separada"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
