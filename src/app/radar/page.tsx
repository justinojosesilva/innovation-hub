import Link from "next/link";
import { getTrends, type TrendsData } from "@/lib/trends";

export const dynamic = "force-dynamic";

// Consistent colors across ranking bars, timeline segments and legend.
const PALETTE = [
  { bar: "bg-indigo-500", text: "text-indigo-500" },
  { bar: "bg-emerald-500", text: "text-emerald-500" },
  { bar: "bg-amber-500", text: "text-amber-500" },
  { bar: "bg-rose-500", text: "text-rose-500" },
  { bar: "bg-sky-500", text: "text-sky-500" },
  { bar: "bg-violet-500", text: "text-violet-500" },
  { bar: "bg-teal-500", text: "text-teal-500" },
  { bar: "bg-orange-500", text: "text-orange-500" },
];

function colorMap(data: TrendsData) {
  const map = new Map<string, (typeof PALETTE)[number]>();
  data.themes.forEach((t, i) => map.set(t.theme, PALETTE[i % PALETTE.length]));
  return map;
}

export default async function RadarPage() {
  const data = await getTrends();
  const colors = colorMap(data);
  const maxCount = data.themes[0]?.ideaCount ?? 1;
  const leader = data.themes[0];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Radar de Tendências</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.themes.length} temas em {data.themedIdeaCount} ideias ·{" "}
            {data.totalReports} relatório{data.totalReports === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      {data.themes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-neutral-500 dark:border-neutral-700">
          Sem temas ainda — importe relatórios para começar a ver tendências.
        </p>
      ) : (
        <>
          {leader && (
            <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                <span className="font-semibold">{leader.theme}</span> lidera: apareceu em{" "}
                <span className="font-semibold">
                  {Math.round(leader.pctOfReports * 100)}%
                </span>{" "}
                dos relatórios e em{" "}
                <span className="font-semibold">
                  {Math.round(leader.pctOfThemedIdeas * 100)}%
                </span>{" "}
                das ideias.
              </p>
            </div>
          )}

          {/* ranking */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Temas por nº de ideias
            </h2>
            <div className="space-y-3">
              {data.themes.map((t) => {
                const color = colors.get(t.theme)!;
                return (
                  <div key={t.theme} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 font-medium">{t.theme}</span>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className={`flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold text-white ${color.bar}`}
                          style={{ width: `${Math.max((t.ideaCount / maxCount) * 100, 8)}%` }}
                        >
                          {t.ideaCount}
                        </div>
                      </div>
                    </div>
                    <span className="w-32 shrink-0 text-right text-xs text-neutral-400">
                      {Math.round(t.pctOfReports * 100)}% dos relatórios
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                      {t.avgScore !== null ? `★ ${t.avgScore.toFixed(1)}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* timeline */}
          <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Ideias por tema ao longo do tempo
            </h2>
            <Timeline data={data} colors={colors} />
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {data.themes.map((t) => (
                <span key={t.theme} className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${colors.get(t.theme)!.bar}`} />
                  {t.theme}
                </span>
              ))}
            </div>
            {data.timeline.length === 1 && (
              <p className="mt-4 text-xs text-neutral-400">
                Apenas 1 relatório até agora — a evolução temporal ganha forma conforme a
                task das 08:00 acumula dias.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Timeline({
  data,
  colors,
}: {
  data: TrendsData;
  colors: ReturnType<typeof colorMap>;
}) {
  const maxTotal = Math.max(...data.timeline.map((p) => p.total), 1);
  const H = 180; // px

  return (
    <div className="flex items-end gap-2 overflow-x-auto" style={{ height: H + 24 }}>
      {data.timeline.map((point) => (
        <div key={point.date} className="flex min-w-10 flex-1 flex-col items-center gap-1">
          <div
            className="flex w-full max-w-16 flex-col-reverse overflow-hidden rounded-md"
            style={{ height: (point.total / maxTotal) * H }}
            title={`${point.label}: ${point.total} ideias`}
          >
            {data.themes
              .filter((t) => point.counts[t.theme])
              .map((t) => (
                <div
                  key={t.theme}
                  className={colors.get(t.theme)!.bar}
                  style={{ height: `${(point.counts[t.theme] / point.total) * 100}%` }}
                  title={`${t.theme}: ${point.counts[t.theme]}`}
                />
              ))}
          </div>
          <span className="text-[10px] tabular-nums text-neutral-400">{point.label}</span>
        </div>
      ))}
    </div>
  );
}
