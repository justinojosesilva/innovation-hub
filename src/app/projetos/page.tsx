import Link from "next/link";
import { Plus, Flag } from "lucide-react";
import { ensureFinflow } from "@/lib/projectFit";
import {
  getPortfolio,
  PROJECT_STATUS_LABEL,
  HEALTH_LABEL,
  HEALTH_DOT,
} from "@/lib/projects";
import { createProjectAction } from "./actions";
import { SubmitButton } from "@/app/_components/submit-button";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  DISCOVERY: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  BUILDING: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  LIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ARCHIVED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

function relativeDays(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export default async function ProjectsPage() {
  await ensureFinflow();
  const projects = await getPortfolio();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Seu portfólio — estado, progresso e o que rolou por último em cada um.
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projetos/${p.id}`}
            className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md motion-reduce:hover:translate-y-0 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {p.name}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[p.status] ?? ""}`}
              >
                {PROJECT_STATUS_LABEL[p.status]}
              </span>
            </div>

            {/* progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-400">
                <span>
                  {p.health && (
                    <span className="mr-1.5 inline-flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${HEALTH_DOT[p.health]}`} />
                      {HEALTH_LABEL[p.health]}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {p.featureDone}/{p.featureTotal} backlog
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.round(p.progress * 100)}%` }}
                />
              </div>
            </div>

            {p.nextMilestone && (
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Flag className="h-3 w-3 shrink-0 text-indigo-400" />
                <span className="truncate">{p.nextMilestone.title}</span>
                {p.nextMilestone.dueDate && (
                  <span className="shrink-0 text-neutral-400">
                    ·{" "}
                    {new Date(p.nextMilestone.dueDate).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      timeZone: "UTC",
                    })}
                  </span>
                )}
              </p>
            )}
            <p className="mt-auto line-clamp-2 text-xs text-neutral-500">
              <span className="text-neutral-400">{relativeDays(p.lastUpdateAt)}:</span>{" "}
              {p.lastUpdateBody ?? "sem updates ainda"}
            </p>
          </Link>
        ))}
      </div>

      {/* New project */}
      <details className="mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          <Plus className="h-4 w-4" strokeWidth={2} /> Novo projeto
        </summary>
        <form action={createProjectAction} className="flex flex-col gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Nome</span>
            <input
              name="name"
              required
              placeholder="Ex.: Giro"
              className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Contexto (o que é, faz, stack, objetivo)</span>
            <textarea
              name="context"
              required
              rows={5}
              placeholder="Descreva o produto para a IA avaliar bem a aplicabilidade das ideias…"
              className="resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            />
          </label>
          <div>
            <SubmitButton
              pendingText="Criando…"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Criar projeto
            </SubmitButton>
          </div>
        </form>
      </details>
    </main>
  );
}
