import Link from "next/link";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  getRankedIdeas,
  getCategories,
  getReportDates,
  getWeights,
  type RankedIdea,
} from "@/lib/ranking";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";
import { RankingControls } from "./ranking-controls";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function num(sp: SearchParams, key: string): number | undefined {
  const v = sp[key];
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function str(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// Weights come from the query string when present (live sliders), else the DB.
function resolveWeights(sp: SearchParams, dbWeights: Weights): Weights {
  const override = {
    monetizacao: num(sp, "wMon"),
    implementacao: num(sp, "wImp"),
    stackFit: num(sp, "wStk"),
    tendencia: num(sp, "wTen"),
    diferencial: num(sp, "wDif"),
  };
  const hasOverride = Object.values(override).some((v) => v !== undefined);
  if (!hasOverride) return dbWeights;
  return {
    monetizacao: override.monetizacao ?? DEFAULT_WEIGHTS.monetizacao,
    implementacao: override.implementacao ?? DEFAULT_WEIGHTS.implementacao,
    stackFit: override.stackFit ?? DEFAULT_WEIGHTS.stackFit,
    tendencia: override.tendencia ?? DEFAULT_WEIGHTS.tendencia,
    diferencial: override.diferencial ?? DEFAULT_WEIGHTS.diferencial,
  };
}

const STATUS_STYLES: Record<string, string> = {
  NOVA: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  EM_AVALIACAO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  EM_VALIDACAO: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  MVP: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  PRODUCAO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  DESCARTADA: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const COMPLEXITY_DOT: Record<string, string> = {
  BAIXA: "bg-emerald-500",
  MEDIA: "bg-amber-500",
  ALTA: "bg-rose-500",
};

function medal(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const dbWeights = await getWeights();
  const weights = resolveWeights(sp, dbWeights);
  const category = str(sp, "category");
  const status = str(sp, "status");
  const reaction = str(sp, "reaction");
  const date = str(sp, "date");

  const [ideas, categories, dates] = await Promise.all([
    getRankedIdeas(weights, { category, status, reaction, date }),
    getCategories(),
    getReportDates(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ranking de Ideias</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Qual ideia vale seu tempo — {ideas.length} ideia
            {ideas.length === 1 ? "" : "s"} catalogada{ideas.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-neutral-500 underline-offset-4 hover:underline"
        >
          ← início
        </Link>
      </header>

      <div className="mb-6">
        <RankingControls
          weights={weights}
          categories={categories}
          dates={dates}
          category={category}
          status={status}
          reaction={reaction}
          date={date}
        />
      </div>

      {ideas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <RankCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </main>
  );
}

function RankCard({ idea }: { idea: RankedIdea }) {
  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md motion-reduce:hover:translate-y-0 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-sm font-semibold tabular-nums text-neutral-500 dark:bg-neutral-800">
          {medal(idea.rank)}
        </span>
        <div className="flex items-center gap-1.5">
          {idea.reaction === "LIKED" && (
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
          )}
          {idea.reaction === "DISLIKED" && (
            <ThumbsDown className="h-3.5 w-3.5 text-rose-500" strokeWidth={2.5} />
          )}
          <ScoreBadge score={idea.finalScore} large />
        </div>
      </div>

      <div className="flex items-start gap-2">
        {idea.complexity && (
          <span
            title={`Complexidade ${idea.complexity}`}
            className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
              COMPLEXITY_DOT[idea.complexity] ?? "bg-neutral-400"
            }`}
          />
        )}
        <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {idea.title}
        </h3>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs">
        {idea.isTopOpportunity && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Top
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[idea.status] ?? ""}`}
        >
          {idea.status.replace(/_/g, " ").toLowerCase()}
        </span>
        {idea.category && <span className="text-neutral-400">{idea.category}</span>}
      </div>
      <div className="text-[11px] text-neutral-400">
        {new Date(idea.sourceDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
      </div>
    </Link>
  );
}

function ScoreBadge({ score, large }: { score: number | null; large?: boolean }) {
  if (score === null) return <span className="text-neutral-300">—</span>;
  const tone =
    score >= 8.5
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 7.5
      ? "text-indigo-600 dark:text-indigo-400"
      : "text-neutral-600 dark:text-neutral-300";
  return (
    <span className={`font-semibold tabular-nums ${large ? "text-2xl" : "text-base"} ${tone}`}>
      {score.toFixed(1)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
      <p className="text-neutral-500">Nenhuma ideia importada ainda.</p>
      <p className="mt-2 text-sm text-neutral-400">
        Rode <code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">pnpm import</code>{" "}
        para importar os relatórios em <code>REPORTS_DIR</code>.
      </p>
    </div>
  );
}
