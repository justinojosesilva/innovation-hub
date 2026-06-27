import { prisma } from "@/lib/db";

// Compound categories ("DevTool / Segurança") are split into themes for the radar.
const EXCLUDE = new Set(["top oportunidade"]);

export function deriveThemes(category: string | null): string[] {
  if (!category) return [];
  return category
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !EXCLUDE.has(s.toLowerCase()));
}

export type ThemeStat = {
  theme: string;
  ideaCount: number;
  reportCount: number;
  pctOfThemedIdeas: number; // share of themed ideas (0..1)
  pctOfReports: number; // share of reports it appeared in (0..1)
  avgScore: number | null;
};

export type TrendPoint = {
  date: string; // ISO yyyy-mm-dd
  label: string; // dd/mm
  total: number;
  counts: Record<string, number>;
};

export type TrendsData = {
  totalReports: number;
  themedIdeaCount: number;
  themes: ThemeStat[];
  timeline: TrendPoint[];
};

export async function getTrends(): Promise<TrendsData> {
  const [ideas, totalReports] = await Promise.all([
    prisma.idea.findMany({
      select: {
        category: true,
        reportId: true,
        discoveredAt: true,
        report: { select: { sourceDate: true } },
        score: { select: { reportScore: true } },
      },
    }),
    prisma.report.count(),
  ]);

  const ideaCount = new Map<string, number>();
  const reportSets = new Map<string, Set<string>>();
  const scoreSums = new Map<string, { sum: number; n: number }>();
  const byDate = new Map<string, { sourceDate: Date; counts: Map<string, number> }>();
  let themedIdeaCount = 0;

  for (const idea of ideas) {
    const themes = deriveThemes(idea.category);
    if (themes.length === 0) continue;
    themedIdeaCount++;

    const sd = idea.report?.sourceDate ?? idea.discoveredAt;
    const dateKey = sd.toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { sourceDate: sd, counts: new Map() });
    }
    const dateBucket = byDate.get(dateKey)!.counts;
    const score = idea.score?.reportScore ? Number(idea.score.reportScore) : null;

    for (const theme of themes) {
      ideaCount.set(theme, (ideaCount.get(theme) ?? 0) + 1);

      if (!reportSets.has(theme)) reportSets.set(theme, new Set());
      if (idea.reportId) reportSets.get(theme)!.add(idea.reportId);

      dateBucket.set(theme, (dateBucket.get(theme) ?? 0) + 1);

      if (score !== null) {
        const acc = scoreSums.get(theme) ?? { sum: 0, n: 0 };
        acc.sum += score;
        acc.n += 1;
        scoreSums.set(theme, acc);
      }
    }
  }

  const themes: ThemeStat[] = [...ideaCount.entries()]
    .map(([theme, count]) => {
      const acc = scoreSums.get(theme);
      const reportCount = reportSets.get(theme)?.size ?? 0;
      return {
        theme,
        ideaCount: count,
        reportCount,
        pctOfThemedIdeas: themedIdeaCount > 0 ? count / themedIdeaCount : 0,
        pctOfReports: totalReports > 0 ? reportCount / totalReports : 0,
        avgScore: acc && acc.n > 0 ? Math.round((acc.sum / acc.n) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.ideaCount - a.ideaCount || a.theme.localeCompare(b.theme));

  const timeline: TrendPoint[] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, bucket]) => {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const [theme, n] of bucket.counts) {
        counts[theme] = n;
        total += n;
      }
      return {
        date,
        label: bucket.sourceDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "UTC",
        }),
        total,
        counts,
      };
    });

  return { totalReports, themedIdeaCount, themes, timeline };
}
