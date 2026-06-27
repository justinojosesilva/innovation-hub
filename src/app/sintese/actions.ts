"use server";

import { revalidatePath } from "next/cache";
import { clusterIdeas, synthesizeCluster, saveClusterAsIdea } from "@/lib/synthesis";

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
