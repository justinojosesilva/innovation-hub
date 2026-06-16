import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { parseDailyTechScout } from "@/lib/parser/daily-tech-scout";
import { awardIdeaCreated } from "@/lib/gamification";

export type ImportResult = {
  file: string;
  status: "imported" | "skipped";
  reportId?: string;
  ideaCount?: number;
};

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Import a single .md report from a file path. Idempotent (sha256 hash). */
export async function importFile(filePath: string): Promise<ImportResult> {
  const fileName = path.basename(filePath);
  const rawMd = await readFile(filePath, "utf8");
  return importContent(rawMd, { fileName, filePath });
}

/**
 * Import a report from raw markdown (e.g. an upload). Idempotent: the sha256 of
 * the content is the duplicate guard — re-importing the same file is skipped.
 */
export async function importContent(
  rawMd: string,
  opts: { fileName: string; filePath: string }
): Promise<ImportResult> {
  const { fileName, filePath } = opts;
  const fileHash = sha256(rawMd);

  const existing = await prisma.report.findUnique({ where: { fileHash } });
  if (existing) {
    return { file: fileName, status: "skipped", reportId: existing.id };
  }

  const parsed = parseDailyTechScout(rawMd, fileName);

  const report = await prisma.report.create({
    data: {
      sourceDate: parsed.sourceDate,
      title: parsed.title,
      filePath,
      fileHash,
      rawMd,
      ideas: {
        create: parsed.ideas.map((idea) => ({
          title: idea.title,
          slug: idea.slug,
          category: idea.category,
          source: idea.source,
          sourceUrl: idea.sourceUrl,
          description: idea.description,
          whyItMatters: idea.whyItMatters,
          howToImplement: idea.howToImplement,
          monetization: idea.monetization,
          problem: idea.problem,
          solution: idea.solution,
          audience: idea.audience,
          mvp: idea.mvp,
          stack: idea.stack,
          complexity: idea.complexity ?? undefined,
          isTopOpportunity: idea.isTopOpportunity,
          discoveredAt: parsed.sourceDate,
          rawSection: idea.rawSection,
          score: {
            create: {
              monetizacao: idea.criteria.monetizacao,
              implementacao: idea.criteria.implementacao,
              stackFit: idea.criteria.stackFit,
              tendencia: idea.criteria.tendencia,
              diferencial: idea.criteria.diferencial,
              reportScore: idea.reportScore ?? undefined,
            },
          },
        })),
      },
    },
    include: { ideas: { select: { id: true } } },
  });

  // Module 11: +10 XP per cataloged idea (idempotent).
  for (const idea of report.ideas) {
    await awardIdeaCreated(idea.id);
  }

  return {
    file: fileName,
    status: "imported",
    reportId: report.id,
    ideaCount: report.ideas.length,
  };
}

/** Import every *.md file in a directory (non-recursive). */
export async function importDir(dir: string): Promise<ImportResult[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const files = entries.filter((f) => f.toLowerCase().endsWith(".md")).sort();
  const results: ImportResult[] = [];
  for (const f of files) {
    results.push(await importFile(path.join(dir, f)));
  }
  return results;
}

/** Make sure the singleton weights row exists (id = 1). */
export async function ensureWeights() {
  return prisma.scoreWeights.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
