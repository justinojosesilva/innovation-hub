import Link from "next/link";
import {
  Lightbulb,
  FileText,
  Gauge,
  Rocket,
  GitMerge,
  ArrowRight,
  Upload,
} from "lucide-react";
import { getDashboard } from "@/lib/dashboard";
import { LevelCard } from "@/app/_components/level-card";
import { TrendArea, CriteriaRadar } from "@/app/_components/charts";

export const dynamic = "force-dynamic";

const LEVEL_STYLE: Record<string, string> = {
  ALTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MEDIO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  BAIXO: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const LEVEL_LABEL: Record<string, string> = { ALTO: "Alto", MEDIO: "Médio", BAIXO: "Baixo" };
const COMPLEXITY_DOT: Record<string, string> = {
  BAIXA: "bg-emerald-500",
  MEDIA: "bg-amber-500",
  ALTA: "bg-rose-500",
};

export default async function DashboardPage() {
  const d = await getDashboard();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Visão geral do pipeline de ideias — qual delas vale o seu tempo.
          </p>
        </div>
        <Link
          href="/importar"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-200"
        >
          <Upload className="h-4 w-4" /> Importar
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={Lightbulb} label="Ideias" value={d.kpis.ideas} />
        <Kpi icon={FileText} label="Relatórios" value={d.kpis.reports} />
        <Kpi icon={Gauge} label="Nível" value={d.kpis.level} hint={`${d.kpis.totalXp} XP`} />
        <Kpi icon={Rocket} label="Prontas p/ projeto" value={d.kpis.readyForProject} />
        <Kpi icon={GitMerge} label="Duplicatas" value={d.kpis.openDuplicates} hint="abertas" />
      </div>

      {/* Row A: trend + level */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Crescimento do catálogo">
          {d.trend.length > 1 ? (
            <TrendArea data={d.trend} />
          ) : (
            <Hint>Importe mais relatórios para ver a evolução no tempo.</Hint>
          )}
        </Card>
        <div className="lg:col-span-1">
          <LevelCard profile={d.profile} />
        </div>
      </div>

      {/* Row B: ranking + radar */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Top ideias" href="/ranking">
          <div className="grid gap-2 sm:grid-cols-2">
            {d.topIdeas.map((idea) => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="group flex items-center gap-2.5 rounded-lg border border-neutral-200 p-2.5 transition-colors hover:border-indigo-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-indigo-700 dark:hover:bg-neutral-800/40"
              >
                <span className="w-5 shrink-0 text-center text-base">
                  {idea.rank === 1 ? "🥇" : idea.rank === 2 ? "🥈" : idea.rank === 3 ? "🥉" : idea.rank}
                </span>
                {idea.complexity && (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${COMPLEXITY_DOT[idea.complexity] ?? ""}`} />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {idea.title}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {idea.finalScore?.toFixed(1) ?? "—"}
                </span>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-1" title="Critérios — líder">
          {d.topCriteria ? (
            <>
              <CriteriaRadar data={d.topCriteria.data} />
              <p className="mt-1 truncate text-center text-xs text-neutral-400">
                {d.topCriteria.title}
              </p>
            </>
          ) : (
            <Hint>Sem ideias pontuadas ainda.</Hint>
          )}
        </Card>
      </div>

      {/* Row C: themes + pipeline + finflow */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Temas em alta" href="/radar">
          <div className="space-y-2">
            {d.themes.map((t) => {
              const max = d.themes[0]?.ideaCount ?? 1;
              return (
                <div key={t.theme} className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 truncate text-neutral-600 dark:text-neutral-400">{t.theme}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(t.ideaCount / max) * 100}%` }} />
                  </div>
                  <span className="w-5 text-right text-xs tabular-nums text-neutral-400">{t.ideaCount}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Pipeline" href="/roadmap">
          <div className="space-y-2">
            {d.pipeline.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">{s.label}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs tabular-nums text-neutral-500 dark:bg-neutral-800">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Aplicáveis ao finflow" href="/projetos/finflow">
          {d.finflowFits.length === 0 ? (
            <Hint>Rode a avaliação em finflow.</Hint>
          ) : (
            <ul className="space-y-2">
              {d.finflowFits.map((f) => (
                <li key={f.ideaId} className="text-sm">
                  <Link href={`/ideas/${f.ideaId}`} className="block truncate font-medium underline-offset-4 hover:underline">
                    {f.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                    <Badge value={f.roi} label="ROI" />
                    <Badge value={f.impact} label="Impacto" />
                    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-neutral-500 dark:bg-neutral-800">
                      ~{f.effortWeeks} sem
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Portfolio */}
      {d.portfolio.total > 0 && (
        <div className="mt-4">
          <Card title="Projetos" href="/projetos">
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> {d.portfolio.onTrack} no caminho
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> {d.portfolio.atRisk} em risco
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> {d.portfolio.stalled} parados
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.portfolio.items.map((p) => (
                <Link
                  key={p.id}
                  href={`/projetos/${p.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5 transition-colors hover:border-indigo-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-indigo-700 dark:hover:bg-neutral-800/40"
                >
                  {p.health && (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        p.health === "ON_TRACK"
                          ? "bg-emerald-500"
                          : p.health === "AT_RISK"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {p.name}
                  </span>
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(p.progress * 100)}%` }} />
                  </div>
                </Link>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </main>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Lightbulb;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-1.5 text-neutral-400">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}

function Card({
  title,
  href,
  className,
  children,
}: {
  title: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">{title}</h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-xs text-neutral-400 underline-offset-4 hover:text-indigo-500 hover:underline"
          >
            ver tudo <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 font-medium ${LEVEL_STYLE[value] ?? ""}`}>
      {label}: {LEVEL_LABEL[value] ?? value}
    </span>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-neutral-400">{children}</p>;
}
