import { prisma } from "@/lib/db";

// Module 11 — XP rules. Each milestone is granted at most once per idea.
export const XP_CREATED = 10;

export const STATUS_XP: Record<string, { type: string; xp: number }> = {
  EM_VALIDACAO: { type: "IDEA_VALIDATED", xp: 50 },
  MVP: { type: "IDEA_MVP", xp: 200 },
  PRODUCAO: { type: "IDEA_LAUNCHED", xp: 1000 },
};

/** Idempotent: grant the "idea cataloged" XP once for an idea. */
export async function awardIdeaCreated(ideaId: string) {
  await prisma.xpEvent.upsert({
    where: { ideaId_type: { ideaId, type: "IDEA_CREATED" } },
    update: {},
    create: { ideaId, type: "IDEA_CREATED", xp: XP_CREATED },
  });
}

/** Idempotent: grant the milestone XP for reaching a status (no-op for non-milestones). */
export async function awardStatusMilestone(ideaId: string, status: string) {
  const rule = STATUS_XP[status];
  if (!rule) return;
  await prisma.xpEvent.upsert({
    where: { ideaId_type: { ideaId, type: rule.type } },
    update: {},
    create: { ideaId, type: rule.type, xp: rule.xp },
  });
}

// Project work XP — granted at most once per entity via the unique `key`.
export const XP_MILESTONE = 50;
export const XP_FEATURE_DONE = 20;

/** Idempotent (by key): grant XP for a project milestone/feature reaching done. */
export async function awardKeyed(key: string, type: string, xp: number) {
  await prisma.xpEvent.upsert({
    where: { key },
    update: {},
    create: { key, type, xp },
  });
}

// ---- levels -------------------------------------------------------------
// Cumulative XP to reach level L is 50 * (L-1) * L  -> 0, 100, 300, 600, 1000…
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp: number): number {
  const l = Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100);
  return Math.max(1, l);
}

export type Profile = {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1 toward next level
  ideaCount: number;
};

export async function getProfile(): Promise<Profile> {
  const [agg, ideaCount] = await Promise.all([
    prisma.xpEvent.aggregate({ _sum: { xp: true } }),
    prisma.idea.count(),
  ]);
  const totalXp = agg._sum.xp ?? 0;
  const level = levelFromXp(totalXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - base;
  return {
    totalXp,
    level,
    xpIntoLevel: totalXp - base,
    xpForNextLevel: span,
    progress: span > 0 ? (totalXp - base) / span : 0,
    ideaCount,
  };
}

// ---- achievements -------------------------------------------------------
export type Achievement = {
  slug: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
};

export async function getAchievements(): Promise<Achievement[]> {
  const [ideaCount, byType] = await Promise.all([
    prisma.idea.count(),
    prisma.xpEvent.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  const count = (type: string) =>
    byType.find((b) => b.type === type)?._count._all ?? 0;
  const validated = count("IDEA_VALIDATED");
  const mvp = count("IDEA_MVP");
  const launched = count("IDEA_LAUNCHED");
  const milestones = count("MILESTONE_DONE");
  const featuresDone = count("FEATURE_DONE");

  const make = (
    slug: string,
    icon: string,
    title: string,
    description: string,
    current: number,
    target: number
  ): Achievement => ({
    slug,
    icon,
    title,
    description,
    current: Math.min(current, target),
    target,
    earned: current >= target,
  });

  return [
    make("primeira-ideia", "💡", "Primeira Ideia", "Catalogue sua primeira ideia.", ideaCount, 1),
    make("colecionador", "📚", "Colecionador", "10 ideias catalogadas.", ideaCount, 10),
    make("centuriao", "🏛️", "100 Ideias", "100 ideias catalogadas.", ideaCount, 100),
    make("validador", "🔬", "Validador", "Valide sua primeira ideia.", validated, 1),
    make("primeiro-mvp", "🚀", "Primeiro MVP", "Leve uma ideia até MVP.", mvp, 1),
    make("primeiro-saas", "🏆", "Primeiro SaaS", "Coloque uma ideia em produção.", launched, 1),
    make("executor", "🛠️", "Executor", "Entregue sua primeira feature de projeto.", featuresDone, 1),
    make("primeiro-marco", "🏁", "Primeiro Marco", "Conclua um marco de projeto.", milestones, 1),
    make("maratonista", "🎯", "Maratonista", "Conclua 10 marcos.", milestones, 10),
  ];
}

/** One-time idempotent backfill for ideas/statuses that predate gamification. */
export async function backfillXp() {
  const ideas = await prisma.idea.findMany({ select: { id: true, status: true } });
  for (const idea of ideas) {
    await awardIdeaCreated(idea.id);
    await awardStatusMilestone(idea.id, idea.status);
  }
  return ideas.length;
}
