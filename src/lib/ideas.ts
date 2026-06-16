import { prisma } from "@/lib/db";
import { computeScore, round1, type Weights } from "@/lib/scoring";
import { getWeights } from "@/lib/ranking";

export const IDEA_STATUSES = [
  "NOVA",
  "EM_AVALIACAO",
  "EM_VALIDACAO",
  "MVP",
  "PRODUCAO",
  "DESCARTADA",
] as const;
export type IdeaStatusValue = (typeof IDEA_STATUSES)[number];

export const NOTE_KINDS = [
  "observacao",
  "problema",
  "concorrente",
  "feedback",
  "link",
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export type CriterionBreakdown = {
  key: keyof Weights;
  label: string;
  nota: number | null;
  weight: number;
  contribution: number | null;
};

const CRITERIA_META: { key: keyof Weights; label: string }[] = [
  { key: "monetizacao", label: "Monetização" },
  { key: "implementacao", label: "Implementação" },
  { key: "stackFit", label: "Stack Fit" },
  { key: "tendencia", label: "Tendência" },
  { key: "diferencial", label: "Diferencial" },
];

export async function getIdea(id: string) {
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      score: true,
      report: { select: { sourceDate: true, title: true } },
      notes: { orderBy: { createdAt: "desc" } },
      features: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!idea) return null;

  const weights = await getWeights();
  const notas = {
    monetizacao: idea.score?.monetizacao ?? null,
    implementacao: idea.score?.implementacao ?? null,
    stackFit: idea.score?.stackFit ?? null,
    tendencia: idea.score?.tendencia ?? null,
    diferencial: idea.score?.diferencial ?? null,
  };

  const weightSum = CRITERIA_META.reduce((acc, c) => acc + weights[c.key], 0);
  const breakdown: CriterionBreakdown[] = CRITERIA_META.map((c) => {
    const nota = notas[c.key];
    const normWeight = weightSum > 0 ? weights[c.key] / weightSum : 0;
    return {
      key: c.key,
      label: c.label,
      nota,
      weight: weights[c.key],
      contribution: nota !== null ? round1(nota * normWeight) : null,
    };
  });

  const reportScore = idea.score?.reportScore ? Number(idea.score.reportScore) : null;
  const computed = computeScore(notas, weights);
  const finalScore = computed ?? (reportScore !== null ? round1(reportScore) : null);

  return { idea, breakdown, finalScore, reportScore, hasBreakdown: computed !== null };
}
