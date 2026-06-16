"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/parser/daily-tech-scout";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  if (!name || !context) return;

  // Unique slug id (append a counter on collision).
  const base = slugify(name) || "projeto";
  let id = base;
  for (let n = 2; await prisma.project.findUnique({ where: { id } }); n++) {
    id = `${base}-${n}`;
  }

  await prisma.project.create({ data: { id, name, context } });
  revalidatePath("/projetos");
  redirect(`/projetos/${id}`);
}

export async function updateProjectContextAction(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  if (!id || !name || !context) return;

  await prisma.project.update({ where: { id }, data: { name, context } });
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/projetos");
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projetos");
  redirect("/projetos");
}
