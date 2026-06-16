import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdea, IDEA_STATUSES, NOTE_KINDS } from "@/lib/ideas";
import { getDocFlags } from "@/lib/generate";
import { getFitsForIdea, getProjectFromIdea } from "@/lib/projectFit";
import { stageMaturity } from "@/lib/maturity";
import { SubmitButton } from "@/app/_components/submit-button";
import { ReactionButtons } from "@/app/_components/reaction-buttons";
import {
  updateStatus,
  updateIdea,
  addNote,
  deleteNote,
  generateCanvasAction,
  generatePrdAction,
  generateSddAction,
  addFeature,
  toggleFeature,
  deleteFeature,
  toggleMaturity,
  promoteToProjectAction,
} from "./actions";
import { Check, Lock } from "lucide-react";

const hasKey = !!process.env.ANTHROPIC_API_KEY;

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NOVA: "Nova",
  EM_AVALIACAO: "Em avaliação",
  EM_VALIDACAO: "Em validação",
  MVP: "MVP",
  PRODUCAO: "Produção",
  DESCARTADA: "Descartada",
};

const COMPLEXITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};
const COMPLEXITY_DOT: Record<string, string> = {
  BAIXA: "bg-emerald-500",
  MEDIA: "bg-amber-500",
  ALTA: "bg-rose-500",
};

const NOTE_BADGE: Record<string, string> = {
  observacao: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  problema: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  concorrente: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  feedback: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  link: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const FIT_LEVEL_STYLE: Record<string, string> = {
  ALTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MEDIO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  BAIXO: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const FIT_LEVEL_LABEL: Record<string, string> = { ALTO: "Alto", MEDIO: "Médio", BAIXO: "Baixo" };

function FitBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${FIT_LEVEL_STYLE[value] ?? ""}`}>
      {label}: {FIT_LEVEL_LABEL[value] ?? value}
    </span>
  );
}

const SCORE_EDIT = [
  ["monetizacao", "Monet."],
  ["implementacao", "Implem."],
  ["stackFit", "Stack"],
  ["tendencia", "Tend."],
  ["diferencial", "Difer."],
] as const;

function EDIT_TEXT_FIELDS(isTopOpp: boolean): [string, string][] {
  return isTopOpp
    ? [
        ["problem", "Problema"],
        ["solution", "Solução"],
        ["audience", "Público-alvo"],
        ["mvp", "MVP"],
        ["stack", "Stack sugerida"],
        ["monetization", "Monetização"],
      ]
    : [
        ["description", "O que é"],
        ["whyItMatters", "Por que importa"],
        ["howToImplement", "Como implementar"],
        ["monetization", "Monetização"],
      ];
}

function EDIT_VALUES(idea: {
  description: string | null;
  whyItMatters: string | null;
  howToImplement: string | null;
  monetization: string | null;
  problem: string | null;
  solution: string | null;
  audience: string | null;
  mvp: string | null;
  stack: string | null;
}): Record<string, string | null> {
  return {
    description: idea.description,
    whyItMatters: idea.whyItMatters,
    howToImplement: idea.howToImplement,
    monetization: idea.monetization,
    problem: idea.problem,
    solution: idea.solution,
    audience: idea.audience,
    mvp: idea.mvp,
    stack: idea.stack,
  };
}

function ArtifactCard({
  ideaId,
  title,
  description,
  exists,
  href,
  action,
  locked,
  lockedHint,
}: {
  ideaId: string;
  title: string;
  description: string;
  exists: boolean;
  href: string;
  action: (formData: FormData) => void;
  locked?: boolean;
  lockedHint?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {exists && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              gerado
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {exists && (
          <Link
            href={href}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Ver
          </Link>
        )}
        {locked ? (
          !exists && (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
              <Lock className="h-3 w-3" /> {lockedHint}
            </span>
          )
        ) : (
          <form action={action}>
            <input type="hidden" name="ideaId" value={ideaId} />
            <SubmitButton
              disabled={!hasKey}
              pendingText="Gerando…"
              className={
                exists
                  ? "rounded-md px-3 py-1.5 text-xs text-neutral-500 underline-offset-4 hover:underline"
                  : "rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
              }
            >
              {exists ? "Regenerar" : "Gerar"}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getIdea(id);
  if (!data) notFound();
  const { idea, breakdown, finalScore, reportScore, hasBreakdown } = data;
  const { hasCanvas, hasPrd, hasSdd } = await getDocFlags(idea.id);
  const fits = await getFitsForIdea(idea.id);
  const maturity = stageMaturity(idea.status, idea.maturityChecks);
  const promotedProject = await getProjectFromIdea(idea.id);

  const sections: { label: string; value: string | null }[] = idea.isTopOpportunity
    ? [
        { label: "Problema", value: idea.problem },
        { label: "Solução", value: idea.solution },
        { label: "Público-alvo", value: idea.audience },
        { label: "MVP", value: idea.mvp },
        { label: "Stack sugerida", value: idea.stack },
        { label: "Monetização", value: idea.monetization },
      ]
    : [
        { label: "O que é", value: idea.description },
        { label: "Por que importa", value: idea.whyItMatters },
        { label: "Como implementar", value: idea.howToImplement },
        { label: "Monetização", value: idea.monetization },
      ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/ranking"
        className="text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← ranking
      </Link>

      {/* header */}
      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            {idea.isTopOpportunity && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Top Oportunidade
              </span>
            )}
            {idea.category && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {idea.category}
              </span>
            )}
            {idea.complexity && (
              <span className="inline-flex items-center gap-1.5 text-neutral-500">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    COMPLEXITY_DOT[idea.complexity]
                  }`}
                />
                Complexidade {COMPLEXITY_LABEL[idea.complexity]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{idea.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Descoberta em{" "}
            {new Date(idea.report.sourceDate).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })}
            {idea.sourceUrl && (
              <>
                {" · "}
                <a
                  href={idea.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 underline-offset-4 hover:underline"
                >
                  {idea.source ?? "fonte"} ↗
                </a>
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <div
            className={`text-4xl font-semibold tabular-nums ${
              finalScore !== null && finalScore >= 8.5
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-indigo-600 dark:text-indigo-400"
            }`}
          >
            {finalScore?.toFixed(1) ?? "—"}
          </div>
          <div className="text-xs text-neutral-400">
            {hasBreakdown ? "score ponderado" : "score do relatório"}
          </div>
          <div className="mt-3 flex justify-end">
            <ReactionButtons ideaId={idea.id} reaction={idea.reaction} />
          </div>
        </div>
      </header>

      {/* edit idea information */}
      <details className="mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Editar informações
        </summary>
        <form action={updateIdea} className="flex flex-col gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
          <input type="hidden" name="ideaId" value={idea.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-neutral-500">Título</span>
              <input
                name="title"
                required
                defaultValue={idea.title}
                className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-neutral-500">Categoria</span>
              <input
                name="category"
                defaultValue={idea.category ?? ""}
                className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
              />
            </label>
          </div>

          {EDIT_TEXT_FIELDS(idea.isTopOpportunity).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500">{label}</span>
              <textarea
                name={key}
                rows={2}
                defaultValue={(EDIT_VALUES(idea)[key] as string | null) ?? ""}
                className="resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
              />
            </label>
          ))}

          {idea.score && (
            <div>
              <p className="mb-1.5 text-sm text-neutral-500">Notas (0–10)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {SCORE_EDIT.map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-xs">
                    <span className="text-neutral-400">{label}</span>
                    <input
                      type="number"
                      name={key}
                      min={0}
                      max={10}
                      defaultValue={(idea.score?.[key] as number | null) ?? ""}
                      className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-neutral-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <SubmitButton
              pendingText="Salvando…"
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Salvar
            </SubmitButton>
          </div>
        </form>
      </details>

      {/* status funnel */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Status
        </h2>
        <div className="flex flex-wrap gap-2">
          {IDEA_STATUSES.map((s) => {
            const active = idea.status === s;
            return (
              <form key={s} action={updateStatus}>
                <input type="hidden" name="ideaId" value={idea.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  disabled={active}
                  className={
                    active
                      ? "rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300"
                  }
                >
                  {STATUS_LABEL[s]}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {/* promote a matured idea to a project */}
      {(idea.status === "PRODUCAO" || promotedProject) && (
        <section className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          {promotedProject ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                ✓ Esta ideia virou um projeto.
              </p>
              <Link
                href={`/projetos/${promotedProject.id}`}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Ver projeto →
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Em produção — pronta para virar um projeto (leva as features junto).
              </p>
              <form action={promoteToProjectAction}>
                <input type="hidden" name="ideaId" value={idea.id} />
                <SubmitButton
                  pendingText="Criando…"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                >
                  Virar projeto
                </SubmitButton>
              </form>
            </div>
          )}
        </section>
      )}

      {/* maturation gate for the current stage */}
      {maturity.items.length > 0 && (
        <section className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Maturação — {STATUS_LABEL[idea.status]}
            </h2>
            <span className="text-xs tabular-nums text-neutral-400">
              {maturity.done}/{maturity.total}
            </span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${
                maturity.complete ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.round(maturity.pct * 100)}%` }}
            />
          </div>
          <ul className="space-y-1.5">
            {maturity.items.map((item) => {
              const done = idea.maturityChecks.includes(item.key);
              return (
                <li key={item.key}>
                  <form action={toggleMaturity} className="flex items-center gap-2">
                    <input type="hidden" name="ideaId" value={idea.id} />
                    <input type="hidden" name="key" value={item.key} />
                    <button
                      type="submit"
                      aria-label={done ? `Desmarcar ${item.label}` : `Marcar ${item.label}`}
                      aria-pressed={done}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300 dark:border-neutral-600"
                      }`}
                    >
                      {done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <span
                      className={`text-sm ${
                        done
                          ? "text-neutral-400 line-through"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {item.label}
                    </span>
                  </form>
                </li>
              );
            })}
          </ul>
          {maturity.complete && (
            <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Fase madura — pronta para avançar.
            </p>
          )}
        </section>
      )}

      {/* score breakdown */}
      {hasBreakdown && (
        <section className="mt-8 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Score por critério
          </h2>
          <div className="space-y-3">
            {breakdown.map((c) => (
              <div key={c.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-neutral-600 dark:text-neutral-400">
                  {c.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${((c.nota ?? 0) / 10) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-neutral-500">
                  {c.nota ?? "—"}/10
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-neutral-400">
                  {Math.round(c.weight * 100)}%
                </span>
              </div>
            ))}
          </div>
          {reportScore !== null && (
            <p className="mt-4 text-xs text-neutral-400">
              Score no relatório: {reportScore.toFixed(1)} · o valor acima recalcula
              conforme os pesos da fórmula.
            </p>
          )}
        </section>
      )}

      {/* content sections */}
      <section className="mt-8 space-y-6">
        {sections
          .filter((s) => s.value)
          .map((s) => (
            <div key={s.label}>
              <h3 className="mb-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {s.label}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {s.value}
              </p>
            </div>
          ))}
      </section>

      {/* Features (proposed functionalities; captured from merges) */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">
          Funcionalidades
          {idea.features.length > 0 && (
            <span className="ml-1.5 text-neutral-400">({idea.features.length})</span>
          )}
        </h2>

        <form
          action={addFeature}
          className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <input type="hidden" name="ideaId" value={idea.id} />
          <input
            name="title"
            required
            placeholder="Nova funcionalidade…"
            className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
          />
          <input
            name="description"
            placeholder="descrição (opcional)"
            className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
          />
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
            Adicionar
          </button>
        </form>

        {idea.features.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nenhuma funcionalidade ainda. Mesclar uma ideia duplicada captura ela aqui.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {idea.features.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <form action={toggleFeature}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="ideaId" value={idea.id} />
                  <button
                    type="submit"
                    aria-label={f.status === "DONE" ? "Marcar como pendente" : "Marcar como feita"}
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${
                      f.status === "DONE"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    {f.status === "DONE" && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      f.status === "DONE" ? "text-neutral-400 line-through" : ""
                    }`}
                  >
                    {f.title}
                  </p>
                  {f.description && (
                    <p className="mt-0.5 text-xs text-neutral-500">{f.description}</p>
                  )}
                  {f.source && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-neutral-400">
                      {f.source}
                    </p>
                  )}
                </div>
                <form action={deleteFeature}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="ideaId" value={idea.id} />
                  <button
                    type="submit"
                    aria-label="Remover funcionalidade"
                    className="text-xs text-neutral-400 underline-offset-4 hover:text-rose-500 hover:underline"
                  >
                    remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AI artifacts: Canvas (M8) + PRD (M9) + SDD */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">Artefatos (IA)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ArtifactCard
            ideaId={idea.id}
            title="Business Model Canvas"
            description="9 blocos do modelo de negócio."
            exists={hasCanvas}
            href={`/ideas/${idea.id}/canvas`}
            action={generateCanvasAction}
          />
          <ArtifactCard
            ideaId={idea.id}
            title="PRD"
            description="Visão, requisitos, user stories, roadmap."
            exists={hasPrd}
            href={`/ideas/${idea.id}/prd`}
            action={generatePrdAction}
          />
          <ArtifactCard
            ideaId={idea.id}
            title="SDD"
            description="Spec técnica: arquitetura, dados, APIs, tarefas."
            exists={hasSdd}
            href={`/ideas/${idea.id}/sdd`}
            action={generateSddAction}
            locked={idea.status !== "MVP" && idea.status !== "PRODUCAO"}
            lockedHint="Disponível em MVP/Produção"
          />
        </div>
        {!hasKey && (
          <p className="mt-2 text-xs text-rose-500">
            Configure ANTHROPIC_API_KEY no .env para gerar artefatos.
          </p>
        )}
      </section>

      {/* M12: applicability to user projects */}
      {fits.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold">Aplicável a projetos</h2>
          <div className="space-y-2">
            {fits.map((fit) => (
              <Link
                key={fit.id}
                href={`/projetos/${fit.project.id}`}
                className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-indigo-800"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-sm font-medium">{fit.project.name}</span>
                  <FitBadge label="Impacto" value={fit.impact} />
                  <FitBadge label="ROI" value={fit.roi} />
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500 dark:bg-neutral-800">
                    ~{fit.effortWeeks} sem
                  </span>
                </div>
                <p className="text-sm text-neutral-500">{fit.rationale}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* notes / CRM */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">Notas & evolução</h2>

        <form
          action={addNote}
          className="mb-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <input type="hidden" name="ideaId" value={idea.id} />
          <div className="flex flex-col gap-3">
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Observação, concorrente, link, feedback…"
              className="w-full resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <div className="flex items-center gap-3">
              <select
                name="kind"
                defaultValue="observacao"
                className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
              >
                {NOTE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Adicionar nota
              </button>
            </div>
          </div>
        </form>

        {idea.notes.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma nota ainda.</p>
        ) : (
          <ul className="space-y-3">
            {idea.notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                    NOTE_BADGE[note.kind] ?? NOTE_BADGE.observacao
                  }`}
                >
                  {note.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line break-words text-sm text-neutral-700 dark:text-neutral-300">
                    {note.body}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(note.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <form action={deleteNote}>
                  <input type="hidden" name="id" value={note.id} />
                  <input type="hidden" name="ideaId" value={idea.id} />
                  <button
                    type="submit"
                    className="text-xs text-neutral-400 underline-offset-4 hover:text-rose-500 hover:underline"
                  >
                    remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
