import { prisma } from "@/lib/db";

// Models offered for the AI features (Canvas/PRD/SDD, dedup, project fit).
export const AI_MODELS = [
  { id: "claude-opus-4-8", label: "Opus 4.8", hint: "qualidade máxima" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "equilíbrio" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", hint: "rápido e barato" },
] as const;

const DEFAULT_MODEL = "claude-opus-4-8";

export function modelLabel(id: string): string {
  return AI_MODELS.find((m) => m.id === id)?.label ?? id;
}

export async function getGenModel(): Promise<string> {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  return row?.genModel ?? DEFAULT_MODEL;
}

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function setGenModel(genModel: string) {
  if (!AI_MODELS.some((m) => m.id === genModel)) return;
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { genModel },
    create: { id: 1, genModel },
  });
}
