"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { analyzeDuplicates } from "@/lib/dedup";

function refresh() {
  revalidatePath("/duplicates");
  revalidatePath("/ranking");
  revalidatePath("/");
}

export async function runAnalysis() {
  await analyzeDuplicates();
  refresh();
}

export async function dismissPair(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.duplicatePair.update({ where: { id }, data: { status: "dismissed" } });
  refresh();
}

// Merge: keep the higher-scored idea, discard the other, move its notes over.
export async function mergePair(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;

  const pair = await prisma.duplicatePair.findUnique({
    where: { id },
    include: {
      ideaA: { include: { score: true } },
      ideaB: { include: { score: true } },
    },
  });
  if (!pair) return;

  const scoreA = pair.ideaA.score?.reportScore ? Number(pair.ideaA.score.reportScore) : 0;
  const scoreB = pair.ideaB.score?.reportScore ? Number(pair.ideaB.score.reportScore) : 0;
  const keeper = scoreA >= scoreB ? pair.ideaA : pair.ideaB;
  const loser = scoreA >= scoreB ? pair.ideaB : pair.ideaA;

  await prisma.$transaction([
    prisma.ideaNote.updateMany({ where: { ideaId: loser.id }, data: { ideaId: keeper.id } }),
    prisma.ideaNote.create({
      data: {
        ideaId: keeper.id,
        kind: "observacao",
        body: `Mesclada com "${loser.title}" (${pair.similarity}% similar): ${pair.rationale}`,
      },
    }),
    // The discarded idea becomes a proposed feature of the survivor.
    prisma.feature.create({
      data: {
        ideaId: keeper.id,
        title: loser.title,
        description: loser.description ?? loser.problem ?? pair.rationale,
        source: `Mesclada de "${loser.title}" (${pair.similarity}% similar)`,
      },
    }),
    prisma.idea.update({ where: { id: loser.id }, data: { status: "DESCARTADA" } }),
    prisma.duplicatePair.update({ where: { id }, data: { status: "merged" } }),
  ]);

  refresh();
}
