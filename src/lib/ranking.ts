import { prisma } from "@/lib/db";
import { computeScore, DEFAULT_WEIGHTS, round1, type Weights } from "@/lib/scoring";

export type RankedIdea = {
  id: string;
  rank: number;
  title: string;
  category: string | null;
  status: string;
  isTopOpportunity: boolean;
  complexity: string | null;
  reaction: string | null;
  sourceDate: Date;
  reportScore: number | null;
  finalScore: number | null; // computed from active weights (falls back to reportScore)
};

export type RankingFilters = {
  category?: string;
  status?: string;
  reaction?: string;
  date?: string; // yyyy-mm-dd of the report's sourceDate
};

/** Load the active weights (DB singleton), falling back to defaults. */
export async function getWeights(): Promise<Weights> {
  const row = await prisma.scoreWeights.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_WEIGHTS;
  return {
    monetizacao: row.monetizacao,
    implementacao: row.implementacao,
    stackFit: row.stackFit,
    tendencia: row.tendencia,
    diferencial: row.diferencial,
  };
}

/**
 * Ranked ideas ordered by final score (desc). The final score is computed
 * in-app from `weights`, so passing override weights re-ranks live without
 * touching the DB. Ideas without a criteria breakdown fall back to the
 * report's printed score.
 */
export async function getRankedIdeas(
  weights: Weights,
  filters: RankingFilters = {}
): Promise<RankedIdea[]> {
  const ideas = await prisma.idea.findMany({
    where: {
      category: filters.category
        ? { contains: filters.category, mode: "insensitive" }
        : undefined,
      status: filters.status ? (filters.status as never) : undefined,
      reaction: filters.reaction ? (filters.reaction as never) : undefined,
      report: filters.date ? { sourceDate: dayRange(filters.date) } : undefined,
    },
    include: { score: true, report: { select: { sourceDate: true } } },
  });

  const ranked = ideas
    .map((idea) => {
      const reportScore = idea.score?.reportScore
        ? Number(idea.score.reportScore)
        : null;
      const computed = idea.score
        ? computeScore(
            {
              monetizacao: idea.score.monetizacao,
              implementacao: idea.score.implementacao,
              stackFit: idea.score.stackFit,
              tendencia: idea.score.tendencia,
              diferencial: idea.score.diferencial,
            },
            weights
          )
        : null;
      const finalScore = computed ?? (reportScore !== null ? round1(reportScore) : null);
      return {
        id: idea.id,
        title: idea.title,
        category: idea.category,
        status: idea.status as string,
        isTopOpportunity: idea.isTopOpportunity,
        complexity: idea.complexity as string | null,
        reaction: idea.reaction as string | null,
        sourceDate: idea.report.sourceDate,
        reportScore,
        finalScore,
      };
    })
    .sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  return ranked.map((idea, i) => ({ ...idea, rank: i + 1 }));
}

/** [start, end) for a yyyy-mm-dd day (reports are stored at UTC midnight). */
function dayRange(date: string): { gte: Date; lt: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

/** Distinct report dates (most recent first) for the day filter. */
export async function getReportDates(): Promise<{ value: string; label: string }[]> {
  const reports = await prisma.report.findMany({
    select: { sourceDate: true },
    distinct: ["sourceDate"],
    orderBy: { sourceDate: "desc" },
  });
  return reports.map((r) => ({
    value: r.sourceDate.toISOString().slice(0, 10),
    label: r.sourceDate.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
  }));
}

/** Distinct categories for the filter dropdown. */
export async function getCategories(): Promise<string[]> {
  const rows = await prisma.idea.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category!).filter(Boolean);
}
