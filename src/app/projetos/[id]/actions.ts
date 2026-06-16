"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { evaluateProjectFits } from "@/lib/projectFit";
import { PROJECT_STATUSES, FEATURE_STATUSES } from "@/lib/projects";
import { awardKeyed, XP_MILESTONE, XP_FEATURE_DONE } from "@/lib/gamification";

function refresh(projectId: string) {
  revalidatePath(`/projetos/${projectId}`);
  revalidatePath("/projetos");
  revalidatePath("/");
}

export async function evaluateFitsAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  if (!projectId) return;
  await evaluateProjectFits(projectId);
  refresh(projectId);
}

// --- status ---
export async function setProjectStatus(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const status = String(formData.get("status"));
  if (!projectId || !PROJECT_STATUSES.includes(status as never)) return;
  await prisma.project.update({ where: { id: projectId }, data: { status: status as never } });
  refresh(projectId);
}

// --- backlog ---
export async function addProjectFeature(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!projectId || !title) return;
  await prisma.feature.create({
    data: { projectId, title, description: description || null },
  });
  refresh(projectId);
}

export async function moveFeature(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const status = String(formData.get("status"));
  if (!id || !FEATURE_STATUSES.includes(status as never)) return;
  await prisma.feature.update({ where: { id }, data: { status: status as never } });
  if (status === "DONE") await awardKeyed(`feature:${id}`, "FEATURE_DONE", XP_FEATURE_DONE);
  refresh(projectId);
}

export async function deleteProjectFeature(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  if (!id) return;
  await prisma.feature.delete({ where: { id } });
  refresh(projectId);
}

/** Add an applicable idea (a fit) to the project backlog as a feature. */
export async function addFitToBacklog(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!projectId || !title) return;
  await prisma.feature.create({
    data: {
      projectId,
      title,
      description: description || null,
      source: "Ideia aplicável",
    },
  });
  refresh(projectId);
}

// --- journal ---
export async function addProjectUpdate(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const kind = String(formData.get("kind") ?? "progresso");
  const body = String(formData.get("body") ?? "").trim();
  if (!projectId || !body) return;
  await prisma.projectUpdate.create({ data: { projectId, kind, body } });
  refresh(projectId);
}

export async function deleteProjectUpdate(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  if (!id) return;
  await prisma.projectUpdate.delete({ where: { id } });
  refresh(projectId);
}

// --- roadmap / milestones ---
export async function addMilestone(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const title = String(formData.get("title") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  if (!projectId || !title) return;
  await prisma.milestone.create({
    data: {
      projectId,
      title,
      dueDate: dueRaw ? new Date(`${dueRaw}T00:00:00.000Z`) : null,
    },
  });
  refresh(projectId);
}

export async function toggleMilestone(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  if (!id) return;
  const m = await prisma.milestone.findUnique({ where: { id }, select: { done: true } });
  if (!m) return;
  const nowDone = !m.done;
  await prisma.milestone.update({ where: { id }, data: { done: nowDone } });
  if (nowDone) await awardKeyed(`milestone:${id}`, "MILESTONE_DONE", XP_MILESTONE);
  refresh(projectId);
}

export async function deleteMilestone(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  if (!id) return;
  await prisma.milestone.delete({ where: { id } });
  refresh(projectId);
}

// --- KPIs ---
export async function addMetric(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  if (!projectId || !name) return;
  await prisma.metric.create({ data: { projectId, name, unit: unit || null } });
  refresh(projectId);
}

export async function deleteMetric(formData: FormData) {
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  if (!id) return;
  await prisma.metric.delete({ where: { id } });
  refresh(projectId);
}

export async function addMetricPoint(formData: FormData) {
  const metricId = String(formData.get("metricId"));
  const projectId = String(formData.get("projectId"));
  const value = Number(formData.get("value"));
  const dateRaw = String(formData.get("date") ?? "").trim();
  if (!metricId || !Number.isFinite(value)) return;
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00.000Z`) : new Date();
  await prisma.metricPoint.create({ data: { metricId, value, date } });
  refresh(projectId);
}
