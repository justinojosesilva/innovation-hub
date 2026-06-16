import { prisma } from "@/lib/db";
import { getWeights } from "@/lib/ranking";
import { computeScore, round1 } from "@/lib/scoring";

// Module 10 — the idea → project pipeline. Stages map to the status funnel
// (Descartada is excluded from the board).
export const PIPELINE_STAGES = [
  "NOVA",
  "EM_AVALIACAO",
  "EM_VALIDACAO",
  "MVP",
  "PRODUCAO",
] as const;
export type Stage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  NOVA: "Nova",
  EM_AVALIACAO: "Em avaliação",
  EM_VALIDACAO: "Em validação",
  MVP: "MVP",
  PRODUCAO: "Produção",
};

const VALIDATED_FROM = PIPELINE_STAGES.indexOf("EM_VALIDACAO");

export type PipelineCard = {
  id: string;
  title: string;
  status: Stage;
  finalScore: number | null;
  complexity: string | null;
  hasCanvas: boolean;
  hasPrd: boolean;
  validated: boolean;
  notesCount: number;
  readiness: number; // 0..3 (validada + canvas + prd)
  readyForProject: boolean; // 3/3 and not yet MVP/Produção
  canAdvance: boolean;
  canRetreat: boolean;
};

export type PipelineColumn = {
  status: Stage;
  label: string;
  cards: PipelineCard[];
};

export async function getPipeline(): Promise<{
  columns: PipelineColumn[];
  discarded: number;
  ready: PipelineCard[];
}> {
  const [ideas, weights, discarded] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { not: "DESCARTADA" } },
      include: {
        score: true,
        docs: { select: { type: true } },
        _count: { select: { notes: true } },
      },
    }),
    getWeights(),
    prisma.idea.count({ where: { status: "DESCARTADA" } }),
  ]);

  const cards: PipelineCard[] = ideas.map((idea) => {
    const stageIdx = PIPELINE_STAGES.indexOf(idea.status as Stage);
    const reportScore = idea.score?.reportScore ? Number(idea.score.reportScore) : null;
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

    const docTypes = new Set(idea.docs.map((d) => d.type));
    const hasCanvas = docTypes.has("CANVAS");
    const hasPrd = docTypes.has("PRD");
    const validated = stageIdx >= VALIDATED_FROM;
    const readiness = [validated, hasCanvas, hasPrd].filter(Boolean).length;

    return {
      id: idea.id,
      title: idea.title,
      status: idea.status as Stage,
      finalScore,
      complexity: idea.complexity as string | null,
      hasCanvas,
      hasPrd,
      validated,
      notesCount: idea._count.notes,
      readiness,
      readyForProject: readiness === 3 && idea.status === "EM_VALIDACAO",
      canAdvance: stageIdx < PIPELINE_STAGES.length - 1,
      canRetreat: stageIdx > 0,
    };
  });

  // Highest-score first within each column.
  cards.sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  const columns: PipelineColumn[] = PIPELINE_STAGES.map((status) => ({
    status,
    label: STAGE_LABEL[status],
    cards: cards.filter((c) => c.status === status),
  }));

  const ready = cards
    .filter((c) => c.readyForProject)
    .sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  return { columns, discarded, ready };
}

/** Next/previous stage in the pipeline (null at the ends). */
export function stageStep(status: Stage, dir: 1 | -1): Stage | null {
  const idx = PIPELINE_STAGES.indexOf(status);
  const next = idx + dir;
  if (next < 0 || next >= PIPELINE_STAGES.length) return null;
  return PIPELINE_STAGES[next];
}
