"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { stageStep, type Stage } from "@/lib/roadmap";
import { awardStatusMilestone } from "@/lib/gamification";

async function move(ideaId: string, dir: 1 | -1) {
  if (!ideaId) return;
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { status: true },
  });
  if (!idea) return;

  const next = stageStep(idea.status as Stage, dir);
  if (!next) return;

  await prisma.idea.update({ where: { id: ideaId }, data: { status: next } });
  await awardStatusMilestone(ideaId, next); // Module 11: grant milestone XP on advance

  revalidatePath("/roadmap");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ranking");
  revalidatePath("/");
}

export async function advanceStage(formData: FormData) {
  await move(String(formData.get("ideaId")), 1);
}

export async function retreatStage(formData: FormData) {
  await move(String(formData.get("ideaId")), -1);
}
