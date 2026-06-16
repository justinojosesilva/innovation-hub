import Link from "next/link";
import { getPipeline, type PipelineCard } from "@/lib/roadmap";
import { advanceStage, retreatStage } from "./actions";

export const dynamic = "force-dynamic";

const COMPLEXITY_DOT: Record<string, string> = {
  BAIXA: "bg-emerald-500",
  MEDIA: "bg-amber-500",
  ALTA: "bg-rose-500",
};

export default async function RoadmapPage() {
  const { columns, discarded, ready } = await getPipeline();
  const total = columns.reduce((acc, c) => acc + c.cards.length, 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pipeline de ideia → projeto · {total} ativa{total === 1 ? "" : "s"}
            {discarded > 0 && ` · ${discarded} descartada${discarded === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      {ready.length > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            ✅ Prontas para virar projeto ({ready.length})
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Validadas e com Canvas + PRD gerados — avance para MVP.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ready.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/ideas/${c.id}`}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:bg-neutral-900 dark:text-emerald-300"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <section key={col.status} className="flex w-72 shrink-0 flex-col">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs tabular-nums text-neutral-500 dark:bg-neutral-800">
                {col.cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {col.cards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
                  vazio
                </p>
              ) : (
                col.cards.map((card) => <Card key={card.id} card={card} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Card({ card }: { card: PipelineCard }) {
  return (
    <article
      className={`rounded-lg border bg-white p-3 dark:bg-neutral-950 ${
        card.readyForProject
          ? "border-emerald-300 dark:border-emerald-800"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/ideas/${card.id}`}
          className="flex items-start gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          {card.complexity && (
            <span
              className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                COMPLEXITY_DOT[card.complexity] ?? "bg-neutral-400"
              }`}
            />
          )}
          {card.title}
        </Link>
        {card.finalScore !== null && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
            {card.finalScore.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Flag on={card.validated} label="Validada" />
        <Flag on={card.hasCanvas} label="Canvas" />
        <Flag on={card.hasPrd} label="PRD" />
        {card.notesCount > 0 && (
          <span className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400">
            {card.notesCount} nota{card.notesCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] tabular-nums text-neutral-400">
          prontidão {card.readiness}/3
        </span>
        <div className="flex gap-1">
          {card.canRetreat && (
            <form action={retreatStage}>
              <input type="hidden" name="ideaId" value={card.id} />
              <button
                title="Voltar estágio"
                aria-label="Voltar estágio"
                className="rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                ←
              </button>
            </form>
          )}
          {card.canAdvance && (
            <form action={advanceStage}>
              <input type="hidden" name="ideaId" value={card.id} />
              <button
                title="Avançar estágio"
                aria-label="Avançar estágio"
                className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                →
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        on
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </span>
  );
}
