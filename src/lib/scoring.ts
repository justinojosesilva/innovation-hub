// Module 4 — the scoring formula.
// Weights live in the DB (ScoreWeights) so the final score re-ranks live when edited.
// All criteria are 0..10; weights should sum to 1, giving a 0..10 final score.

export type Weights = {
  monetizacao: number;
  implementacao: number;
  stackFit: number;
  tendencia: number;
  diferencial: number;
};

export type Criteria = {
  monetizacao: number | null;
  implementacao: number | null;
  stackFit: number | null;
  tendencia: number | null;
  diferencial: number | null;
};

export const DEFAULT_WEIGHTS: Weights = {
  monetizacao: 0.3,
  implementacao: 0.2,
  stackFit: 0.2,
  tendencia: 0.2,
  diferencial: 0.1,
};

/**
 * Weighted final score from the five criteria.
 * Returns null when no criterion is present (e.g. the "Top Oportunidade"
 * section, which only prints an overall score and has no breakdown).
 * Weights are renormalised over whichever criteria exist, so a partial
 * breakdown still yields a sensible 0..10 number.
 */
export function computeScore(c: Criteria, w: Weights): number | null {
  const parts: Array<[number, number]> = [
    [c.monetizacao, w.monetizacao],
    [c.implementacao, w.implementacao],
    [c.stackFit, w.stackFit],
    [c.tendencia, w.tendencia],
    [c.diferencial, w.diferencial],
  ].filter(([nota]) => nota !== null && nota !== undefined) as Array<
    [number, number]
  >;

  if (parts.length === 0) return null;

  const weightSum = parts.reduce((acc, [, weight]) => acc + weight, 0);
  if (weightSum === 0) return null;

  const weighted = parts.reduce((acc, [nota, weight]) => acc + nota * weight, 0);
  return round1(weighted / weightSum);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
