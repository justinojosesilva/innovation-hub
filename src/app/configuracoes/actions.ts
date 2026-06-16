"use server";

import { revalidatePath } from "next/cache";
import { setGenModel } from "@/lib/settings";

export async function setModelAction(formData: FormData) {
  const model = String(formData.get("model"));
  await setGenModel(model);
  revalidatePath("/configuracoes");
}
