import Link from "next/link";
import { Check } from "lucide-react";
import { getSettings, AI_MODELS } from "@/lib/settings";
import { setModelAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-neutral-500">Preferências da plataforma.</p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Modelo de IA</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Usado para gerar Canvas, PRD, SDD, detectar duplicatas e avaliar aplicabilidade.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {AI_MODELS.map((m) => {
            const active = settings.genModel === m.id;
            return (
              <form key={m.id} action={setModelAction}>
                <input type="hidden" name="model" value={m.id} />
                <button
                  type="submit"
                  aria-pressed={active}
                  className={`flex w-full flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                      : "border-neutral-200 hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-indigo-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {active && <Check className="h-3.5 w-3.5 text-indigo-500" strokeWidth={3} />}
                    {m.label}
                  </span>
                  <span className="text-xs text-neutral-400">{m.hint}</span>
                  <span className="mt-1 font-mono text-[10px] text-neutral-400">{m.id}</span>
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );
}
