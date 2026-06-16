"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { promoteIdeaToProject } from "@/lib/projectFit";
import {
  IDEA_STATUSES,
  NOTE_KINDS,
  type IdeaStatusValue,
  type NoteKind,
} from "@/lib/ideas";
import { awardStatusMilestone, awardKeyed, XP_FEATURE_DONE } from "@/lib/gamification";
import { generateCanvas, generatePRD, generateSDD } from "@/lib/generate";

function refresh(ideaId: string) {
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ranking");
  revalidatePath("/");
}

export async function updateStatus(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  const status = String(formData.get("status"));
  if (!ideaId || !IDEA_STATUSES.includes(status as IdeaStatusValue)) return;

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: status as IdeaStatusValue },
  });
  await awardStatusMilestone(ideaId, status); // Module 11: grant milestone XP
  refresh(ideaId);
}

export async function addNote(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  const kind = String(formData.get("kind"));
  const body = String(formData.get("body") ?? "").trim();
  if (!ideaId || !body) return;

  await prisma.ideaNote.create({
    data: {
      ideaId,
      kind: NOTE_KINDS.includes(kind as NoteKind) ? kind : "observacao",
      body,
    },
  });
  refresh(ideaId);
}

export async function deleteNote(formData: FormData) {
  const id = String(formData.get("id"));
  const ideaId = String(formData.get("ideaId"));
  if (!id) return;

  await prisma.ideaNote.delete({ where: { id } });
  refresh(ideaId);
}

export async function addFeature(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!ideaId || !title) return;
  await prisma.feature.create({
    data: { ideaId, title, description: description || null },
  });
  revalidatePath(`/ideas/${ideaId}`);
}

export async function toggleFeature(formData: FormData) {
  const id = String(formData.get("id"));
  const ideaId = String(formData.get("ideaId"));
  if (!id) return;
  const f = await prisma.feature.findUnique({ where: { id }, select: { status: true } });
  if (!f) return;
  const nextStatus = f.status === "DONE" ? "BACKLOG" : "DONE";
  await prisma.feature.update({ where: { id }, data: { status: nextStatus } });
  if (nextStatus === "DONE") await awardKeyed(`feature:${id}`, "FEATURE_DONE", XP_FEATURE_DONE);
  revalidatePath(`/ideas/${ideaId}`);
}

export async function deleteFeature(formData: FormData) {
  const id = String(formData.get("id"));
  const ideaId = String(formData.get("ideaId"));
  if (!id) return;
  await prisma.feature.delete({ where: { id } });
  revalidatePath(`/ideas/${ideaId}`);
}

const TEXT_FIELDS = [
  "category",
  "description",
  "whyItMatters",
  "howToImplement",
  "monetization",
  "problem",
  "solution",
  "audience",
  "mvp",
  "stack",
] as const;
const SCORE_FIELDS = [
  "monetizacao",
  "implementacao",
  "stackFit",
  "tendencia",
  "diferencial",
] as const;

export async function updateIdea(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  if (!ideaId) return;

  // Only touch fields actually present in the submitted form.
  const data: Record<string, string | null> = {};
  const title = String(formData.get("title") ?? "").trim();
  if (title) data.title = title;
  for (const k of TEXT_FIELDS) {
    if (formData.has(k)) data[k] = String(formData.get(k) ?? "").trim() || null;
  }
  await prisma.idea.update({ where: { id: ideaId }, data });

  const score: Record<string, number | null> = {};
  for (const k of SCORE_FIELDS) {
    if (!formData.has(k)) continue;
    const raw = String(formData.get(k) ?? "").trim();
    if (raw === "") score[k] = null;
    else {
      const n = Number(raw);
      score[k] = Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : null;
    }
  }
  if (Object.keys(score).length > 0) {
    await prisma.ideaScore.updateMany({ where: { ideaId }, data: score });
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ranking");
  revalidatePath("/");
}

export async function promoteToProjectAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  if (!ideaId) return;
  const projectId = await promoteIdeaToProject(ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/projetos");
  if (projectId) redirect(`/projetos/${projectId}`);
}

export async function toggleMaturity(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  const key = String(formData.get("key"));
  if (!ideaId || !key) return;
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { maturityChecks: true },
  });
  if (!idea) return;
  const has = idea.maturityChecks.includes(key);
  const next = has
    ? idea.maturityChecks.filter((k) => k !== key)
    : [...idea.maturityChecks, key];
  await prisma.idea.update({ where: { id: ideaId }, data: { maturityChecks: next } });
  revalidatePath(`/ideas/${ideaId}`);
}

export async function generateCanvasAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  if (!ideaId) return;
  await generateCanvas(ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath(`/ideas/${ideaId}/canvas`);
}

export async function generatePrdAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  if (!ideaId) return;
  await generatePRD(ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath(`/ideas/${ideaId}/prd`);
}

export async function generateSddAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId"));
  if (!ideaId) return;
  // Gate: only mature ideas (MVP/Produção) get a technical spec.
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { status: true },
  });
  if (!idea || (idea.status !== "MVP" && idea.status !== "PRODUCAO")) return;
  await generateSDD(ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath(`/ideas/${ideaId}/sdd`);
}
