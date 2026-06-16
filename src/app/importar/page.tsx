import Link from "next/link";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar relatório</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Envie um <code>.md</code> do Daily Tech Scout — vai direto pro banco, sem precisar
            guardar o arquivo.
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <UploadForm />
      </section>

      <p className="mt-4 text-xs text-neutral-400">
        Trava de duplicidade: arquivos com conteúdo idêntico (mesmo sha256) são ignorados. Ideias
        repetidas entre relatórios são detectadas depois em <strong>Duplicatas</strong> (IA).
      </p>
    </main>
  );
}
