"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function setReaction(
  ideaId: string,
  reaction: "LIKED" | "DISLIKED" | null
) {
  if (!ideaId) return;
  await prisma.idea.update({
    where: { id: ideaId },
    data: { reaction: reaction ?? null },
  });
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ranking");
  revalidatePath("/");
}
