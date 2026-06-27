"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clusterIdeas,
  synthesizeCluster,
  saveClusterAsIdea,
  createManualCluster,
  addIdeasToCluster,
  removeIdeaFromCluster,
  deleteCluster,
} from "@/lib/synthesis";

export type ClusterState =
  | { ok: true; clusters: number; analyzed: number }
  | { ok: false; error: string }
  | null;

export async function runClustering(
  _prev: ClusterState,
  _formData: FormData
): Promise<ClusterState> {
  try {
    const r = await clusterIdeas();
    revalidatePath("/sintese");
    return { ok: true, clusters: r.clusters, analyzed: r.analyzed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao agrupar" };
  }
}

export async function synthesizeClusterAction(formData: FormData) {
  const id = String(formData.get("clusterId"));
  if (!id) return;
  await synthesizeCluster(id);
  revalidatePath(`/sintese/${id}`);
  revalidatePath("/sintese");
}

export async function saveAsIdeaAction(formData: FormData) {
  const id = String(formData.get("clusterId"));
  if (!id) return;
  await saveClusterAsIdea(id);
  revalidatePath(`/sintese/${id}`);
  revalidatePath("/sintese");
  revalidatePath("/ranking");
}

// ---- manual editing --------------------------------------------------------
export type CreateState = { ok: false; error: string } | null;

export async function createClusterAction(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const theme = String(formData.get("theme") ?? "").trim();
  const ideaIds = formData.getAll("ideaIds").map(String);
  if (!theme) return { ok: false, error: "Dê um nome ao grupo." };
  if (ideaIds.length < 2) return { ok: false, error: "Escolha ao menos 2 ideias." };
  const id = await createManualCluster(theme, ideaIds);
  revalidatePath("/sintese");
  redirect(`/sintese/${id}`);
}

export async function addIdeasAction(formData: FormData) {
  const id = String(formData.get("clusterId"));
  const ideaIds = formData.getAll("ideaIds").map(String);
  if (!id || ideaIds.length === 0) return;
  await addIdeasToCluster(id, ideaIds);
  revalidatePath(`/sintese/${id}`);
  revalidatePath("/sintese");
}

export async function removeIdeaAction(formData: FormData) {
  const id = String(formData.get("clusterId"));
  const ideaId = String(formData.get("ideaId"));
  if (!id || !ideaId) return;
  await removeIdeaFromCluster(id, ideaId);
  revalidatePath(`/sintese/${id}`);
  revalidatePath("/sintese");
}

export async function deleteClusterAction(formData: FormData) {
  const id = String(formData.get("clusterId"));
  if (!id) return;
  await deleteCluster(id);
  revalidatePath("/sintese");
  redirect("/sintese");
}
