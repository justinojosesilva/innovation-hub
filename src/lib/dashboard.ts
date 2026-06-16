import { prisma } from "@/lib/db";
import { getWeights, getRankedIdeas, type RankedIdea } from "@/lib/ranking";
import { computeScore } from "@/lib/scoring";
import { getProfile, type Profile } from "@/lib/gamification";
import { getTrends, type ThemeStat } from "@/lib/trends";
import { getPipeline } from "@/lib/roadmap";
import { getProjectFits, FINFLOW_ID } from "@/lib/projectFit";
import { getPortfolio } from "@/lib/projects";

export type Kpis = {
  ideas: number;
  reports: number;
  level: number;
  totalXp: number;
  readyForProject: number;
  openDuplicates: number;
};

export type TrendPoint = { label: string; total: number; cumulative: number };
export type StageCount = { label: string; count: number };
export type CriterionPoint = { criterion: string; nota: number };
export type FinflowFit = {
  ideaId: string;
  title: string;
  impact: string;
  roi: string;
  effortWeeks: number;
};

export type DashboardData = {
  kpis: Kpis;
  profile: Profile;
  topIdeas: RankedIdea[];
  themes: ThemeStat[];
  pipeline: StageCount[];
  trend: TrendPoint[];
  topCriteria: { title: string; data: CriterionPoint[] } | null;
  finflowFits: FinflowFit[];
  portfolio: {
    total: number;
    onTrack: number;
    atRisk: number;
    stalled: number;
    items: { id: string; name: string; status: string; health: string | null; progress: number }[];
  };
};

const CRITERIA = [
  ["monetizacao", "Monetização"],
  ["implementacao", "Implementação"],
  ["stackFit", "Stack"],
  ["tendencia", "Tendência"],
  ["diferencial", "Diferencial"],
] as const;

export async function getDashboard(): Promise<DashboardData> {
  const weights = await getWeights();

  const [
    reports,
    openDuplicates,
    profile,
    topIdeas,
    trends,
    pipeline,
    finflowFitsRaw,
    reportRows,
    scoredIdeas,
    portfolioRaw,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.duplicatePair.count({ where: { status: "open" } }),
    getProfile(),
    getRankedIdeas(weights).then((r) => r.slice(0, 5)),
    getTrends(),
    getPipeline(),
    getProjectFits(FINFLOW_ID).catch(() => []),
    prisma.report.findMany({
      orderBy: { sourceDate: "asc" },
      select: { sourceDate: true, _count: { select: { ideas: true } } },
    }),
    prisma.idea.findMany({
      where: { score: { monetizacao: { not: null } } },
      include: { score: true },
    }),
    getPortfolio(),
  ]);

  const portfolio = {
    total: portfolioRaw.length,
    onTrack: portfolioRaw.filter((p) => p.health === "ON_TRACK").length,
    atRisk: portfolioRaw.filter((p) => p.health === "AT_RISK").length,
    stalled: portfolioRaw.filter((p) => p.health === "STALLED").length,
    items: portfolioRaw.slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      health: p.health,
      progress: p.progress,
    })),
  };

  // Cumulative idea catalog over report dates.
  let running = 0;
  const trend: TrendPoint[] = reportRows.map((r) => {
    running += r._count.ideas;
    return {
      label: r.sourceDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
      total: r._count.ideas,
      cumulative: running,
    };
  });

  const pipelineCounts: StageCount[] = pipeline.columns.map((c) => ({
    label: c.label,
    count: c.cards.length,
  }));

  // Top idea (by active weights) that has a 5-criteria breakdown → radar.
  const rankedScored = scoredIdeas
    .map((idea) => {
      const final = computeScore(
        {
          monetizacao: idea.score!.monetizacao,
          implementacao: idea.score!.implementacao,
          stackFit: idea.score!.stackFit,
          tendencia: idea.score!.tendencia,
          diferencial: idea.score!.diferencial,
        },
        weights
      );
      return { idea, final: final ?? 0 };
    })
    .sort((a, b) => b.final - a.final);

  let topCriteria: DashboardData["topCriteria"] = null;
  if (rankedScored[0]) {
    const s = rankedScored[0].idea.score!;
    topCriteria = {
      title: rankedScored[0].idea.title,
      data: CRITERIA.map(([key, label]) => ({
        criterion: label,
        nota: (s[key] as number | null) ?? 0,
      })),
    };
  }

  const finflowFits: FinflowFit[] = finflowFitsRaw.slice(0, 5).map((f) => ({
    ideaId: f.idea.id,
    title: f.idea.title,
    impact: f.impact,
    roi: f.roi,
    effortWeeks: f.effortWeeks,
  }));

  return {
    kpis: {
      ideas: profile.ideaCount,
      reports,
      level: profile.level,
      totalXp: profile.totalXp,
      readyForProject: pipeline.ready.length,
      openDuplicates,
    },
    profile,
    topIdeas,
    themes: trends.themes.slice(0, 6),
    pipeline: pipelineCounts,
    trend,
    topCriteria,
    finflowFits,
    portfolio,
  };
}
