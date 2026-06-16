"use server";

import { revalidatePath } from "next/cache";
import { importContent, ensureWeights } from "@/lib/import";

export type UploadState =
  | { ok: true; status: "imported" | "skipped"; file: string; ideaCount?: number }
  | { ok: false; error: string }
  | null;

export async function importUploadAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo .md" };
  }
  const text = await file.text();
  if (!text.trim()) return { ok: false, error: "Arquivo vazio" };

  await ensureWeights();
  try {
    const r = await importContent(text, {
      fileName: file.name,
      filePath: `upload:${file.name}`,
    });
    revalidatePath("/");
    revalidatePath("/ranking");
    revalidatePath("/radar");
    return {
      ok: true,
      status: r.status as "imported" | "skipped",
      file: r.file,
      ideaCount: r.ideaCount,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao importar" };
  }
}
