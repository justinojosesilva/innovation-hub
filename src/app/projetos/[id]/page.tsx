import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, Plus, Check, Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDocFlags } from "@/lib/generate";
import { getProjectFits, FINFLOW_ID, ensureFinflow } from "@/lib/projectFit";
import {
  getProjectWorkspace,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  FEATURE_STATUSES,
  FEATURE_STATUS_LABEL,
  HEALTH_LABEL,
  HEALTH_DOT,
} from "@/lib/projects";
import { MetricLine } from "@/app/_components/charts";
import { SubmitButton } from "@/app/_components/submit-button";
import {
  evaluateFitsAction,
  setProjectStatus,
  addProjectFeature,
  moveFeature,
  deleteProjectFeature,
  addFitToBacklog,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
  addProjectUpdate,
  deleteProjectUpdate,
  addMetric,
  deleteMetric,
  addMetricPoint,
} from "./actions";
import { updateProjectContextAction, deleteProjectAction } from "../actions";

export const dynamic = "force-dynamic";
const hasKey = !!process.env.ANTHROPIC_API_KEY;

const BASE_TABS: [string, string][] = [
  ["backlog", "Backlog"],
  ["marcos", "Marcos"],
  ["diario", "Diário"],
  ["kpis", "KPIs"],
  ["ideias", "Ideias"],
  ["config", "Config"],
];

const STATUS_STYLE: Record<string, string> = {
  DISCOVERY: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  BUILDING: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  LIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ARCHIVED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const LEVEL_STYLE: Record<string, string> = {
  ALTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MEDIO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  BAIXO: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const NOTE_BADGE: Record<string, string> = {
  progresso: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  decisao: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  bloqueio: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  marco: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export default async function ProjectWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  if (id === FINFLOW_ID) await ensureFinflow();

  const data = await getProjectWorkspace(id);
  if (!data) notFound();
  const { project, featuresByStatus, progress, total, done, health } = data;

  // Origin idea + its artifacts (centralized here when the project was promoted).
  const origin = project.sourceIdeaId
    ? await prisma.idea.findUnique({
        where: { id: project.sourceIdeaId },
        select: { id: true, title: true },
      })
    : null;
  const originDocs = origin ? await getDocFlags(origin.id) : null;

  const tabs: [string, string][] = origin
    ? [...BASE_TABS, ["origem", "Origem"]]
    : BASE_TABS;
  const tab = tabs.some(([k]) => k === tabParam) ? tabParam! : "backlog";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/projetos" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
        ← projetos
      </Link>

      {/* header: name + status + health + progress */}
      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {health && (
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <span className={`inline-block h-2 w-2 rounded-full ${HEALTH_DOT[health]}`} />
              {HEALTH_LABEL[health]}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROJECT_STATUSES.map((s) => {
            const active = project.status === s;
            return (
              <form key={s} action={setProjectStatus}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  disabled={active}
                  className={
                    active
                      ? `rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[s]}`
                      : "rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700"
                  }
                >
                  {PROJECT_STATUS_LABEL[s]}
                </button>
              </form>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="text-xs tabular-nums text-neutral-400">{done}/{total} backlog</span>
        </div>
      </header>

      {/* tabs */}
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/projetos/${id}?tab=${key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === key
                ? "border-indigo-500 font-medium text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "backlog" && <BacklogTab project={project} columns={featuresByStatus} />}
        {tab === "marcos" && <MarcosTab project={project} milestones={project.milestones} />}
        {tab === "diario" && <DiarioTab project={project} updates={project.updates} />}
        {tab === "kpis" && <KpisTab project={project} metrics={project.metrics} />}
        {tab === "ideias" && <IdeiasTab projectId={project.id} />}
        {tab === "origem" && origin && originDocs && <OriginTab idea={origin} docs={originDocs} />}
        {tab === "config" && <ConfigTab project={project} />}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Backlog
type Feature = { id: string; title: string; description: string | null; source: string | null; status: string };

function BacklogTab({
  project,
  columns,
}: {
  project: { id: string };
  columns: { BACKLOG: Feature[]; DOING: Feature[]; DONE: Feature[] };
}) {
  return (
    <div>
      <form action={addProjectFeature} className="mb-5 flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="title"
          required
          placeholder="Nova funcionalidade no backlog…"
          className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
          Adicionar
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        {FEATURE_STATUSES.map((status) => (
          <section key={status}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {FEATURE_STATUS_LABEL[status]}
              </h3>
              <span className="text-xs tabular-nums text-neutral-400">
                {columns[status as keyof typeof columns].length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columns[status as keyof typeof columns].length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
                  vazio
                </p>
              ) : (
                columns[status as keyof typeof columns].map((f) => (
                  <FeatureCard key={f.id} feature={f} projectId={project.id} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ feature, projectId }: { feature: Feature; projectId: string }) {
  const idx = FEATURE_STATUSES.indexOf(feature.status as never);
  const prev = idx > 0 ? FEATURE_STATUSES[idx - 1] : null;
  const next = idx < FEATURE_STATUSES.length - 1 ? FEATURE_STATUSES[idx + 1] : null;
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className={`text-sm font-medium ${feature.status === "DONE" ? "text-neutral-400 line-through" : ""}`}>
        {feature.title}
      </p>
      {feature.description && <p className="mt-0.5 text-xs text-neutral-500">{feature.description}</p>}
      {feature.source && (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-neutral-400">{feature.source}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1">
          {prev && (
            <MoveBtn id={feature.id} projectId={projectId} to={prev} label={`← ${FEATURE_STATUS_LABEL[prev]}`} />
          )}
          {next && (
            <MoveBtn id={feature.id} projectId={projectId} to={next} label={`${FEATURE_STATUS_LABEL[next]} →`} primary />
          )}
        </div>
        <form action={deleteProjectFeature}>
          <input type="hidden" name="id" value={feature.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <button aria-label="Remover" className="text-neutral-400 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </article>
  );
}

function MoveBtn({
  id,
  projectId,
  to,
  label,
  primary,
}: {
  id: string;
  projectId: string;
  to: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={moveFeature}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="status" value={to} />
      <button
        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
          primary
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "border border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- Marcos
function MarcosTab({
  project,
  milestones,
}: {
  project: { id: string };
  milestones: { id: string; title: string; dueDate: Date | null; done: boolean }[];
}) {
  return (
    <div>
      <form action={addMilestone} className="mb-5 flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="title"
          required
          placeholder="Novo marco (ex: MVP no ar)"
          className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <input
          name="dueDate"
          type="date"
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
        <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
          Adicionar
        </button>
      </form>

      {milestones.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhum marco ainda. Defina as metas do roadmap.</p>
      ) : (
        <ol className="space-y-2">
          {milestones.map((m) => {
            const overdue = !m.done && m.dueDate !== null && new Date(m.dueDate).getTime() < Date.now();
            const dueLabel = m.dueDate
              ? new Date(m.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
              : "sem data";
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <form action={toggleMilestone}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="projectId" value={project.id} />
                  <button
                    aria-label={m.done ? "Reabrir marco" : "Concluir marco"}
                    aria-pressed={m.done}
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      m.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    {m.done && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                </form>
                <span
                  className={`flex-1 text-sm font-medium ${
                    m.done ? "text-neutral-400 line-through" : ""
                  }`}
                >
                  {m.title}
                </span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    overdue ? "font-medium text-rose-500" : "text-neutral-400"
                  }`}
                >
                  {overdue ? `atrasado · ${dueLabel}` : dueLabel}
                </span>
                <form action={deleteMilestone}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="projectId" value={project.id} />
                  <button aria-label="Remover marco" className="text-neutral-400 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Diário
function DiarioTab({
  project,
  updates,
}: {
  project: { id: string };
  updates: { id: string; kind: string; body: string; createdAt: Date }[];
}) {
  return (
    <div>
      <form action={addProjectUpdate} className="mb-5 flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <input type="hidden" name="projectId" value={project.id} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="O que rolou? decisão, progresso, bloqueio…"
          className="w-full resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <div className="flex items-center gap-3">
          <select
            name="kind"
            defaultValue="progresso"
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            {["progresso", "decisao", "bloqueio", "marco"].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
            Registrar
          </button>
        </div>
      </form>

      {updates.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhum update ainda.</p>
      ) : (
        <ul className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${NOTE_BADGE[u.kind] ?? NOTE_BADGE.progresso}`}>
                {u.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line break-words text-sm text-neutral-700 dark:text-neutral-300">{u.body}</p>
                <p className="mt-1 text-xs text-neutral-400">{new Date(u.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <form action={deleteProjectUpdate}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="projectId" value={project.id} />
                <button aria-label="Remover" className="text-xs text-neutral-400 underline-offset-4 hover:text-rose-500 hover:underline">
                  remover
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- KPIs
function KpisTab({
  project,
  metrics,
}: {
  project: { id: string };
  metrics: {
    id: string;
    name: string;
    unit: string | null;
    points: { value: number; date: Date }[];
  }[];
}) {
  return (
    <div className="space-y-4">
      <form action={addMetric} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={project.id} />
        <input name="name" required placeholder="Nova métrica (ex: WAU)" className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700" />
        <input name="unit" placeholder="unidade (ex: usuários)" className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700" />
        <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
          <Plus className="inline h-3.5 w-3.5" /> Métrica
        </button>
      </form>

      {metrics.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhuma métrica ainda. Defina KPIs e registre valores no tempo.</p>
      ) : (
        metrics.map((m) => (
          <section key={m.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{m.name}</span>
                {m.unit && <span className="ml-1.5 text-xs text-neutral-400">({m.unit})</span>}
                {m.points.length > 0 && (
                  <span className="ml-2 text-xs tabular-nums text-indigo-600 dark:text-indigo-400">
                    atual: {m.points[m.points.length - 1].value}
                  </span>
                )}
              </div>
              <form action={deleteMetric}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="projectId" value={project.id} />
                <button aria-label="Remover métrica" className="text-neutral-400 hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            {m.points.length > 0 ? (
              <MetricLine
                data={m.points.map((p) => ({
                  label: new Date(p.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: "UTC",
                  }),
                  value: p.value,
                }))}
              />
            ) : (
              <p className="py-4 text-center text-xs text-neutral-400">Sem valores ainda.</p>
            )}

            <form action={addMetricPoint} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="metricId" value={m.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <input name="value" type="number" step="any" required placeholder="valor" className="w-28 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" />
              <input name="date" type="date" className="rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" />
              <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300">
                Registrar valor
              </button>
            </form>
          </section>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Ideias aplicáveis
async function IdeiasTab({ projectId }: { projectId: string }) {
  const fits = await getProjectFits(projectId);
  return (
    <div>
      <form action={evaluateFitsAction} className="mb-5">
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton
          disabled={!hasKey}
          pendingText="Avaliando…"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          {fits.length === 0 ? "Avaliar aplicabilidade" : "Reavaliar"}
        </SubmitButton>
      </form>

      {fits.length === 0 ? (
        <p className="text-sm text-neutral-400">
          A IA cruza cada ideia do catálogo com este projeto e estima impacto, esforço e ROI.
        </p>
      ) : (
        <ul className="space-y-3">
          {fits.map((fit) => (
            <li key={fit.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/ideas/${fit.idea.id}`} className="font-medium underline-offset-4 hover:underline">
                  {fit.idea.title}
                </Link>
                <form action={addFitToBacklog}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="title" value={fit.idea.title} />
                  <input type="hidden" name="description" value={fit.rationale} />
                  <button className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300">
                    + backlog
                  </button>
                </form>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_STYLE[fit.impact] ?? ""}`}>
                  Impacto: {fit.impact.toLowerCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_STYLE[fit.roi] ?? ""}`}>
                  ROI: {fit.roi.toLowerCase()}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500 dark:bg-neutral-800">
                  ~{fit.effortWeeks} sem
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-500">{fit.rationale}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Origem
function OriginTab({
  idea,
  docs,
}: {
  idea: { id: string; title: string };
  docs: { hasCanvas: boolean; hasPrd: boolean; hasSdd: boolean };
}) {
  const artifacts: [string, string, boolean][] = [
    ["Canvas", "canvas", docs.hasCanvas],
    ["PRD", "prd", docs.hasPrd],
    ["SDD", "sdd", docs.hasSdd],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Ideia de origem</p>
        <Link
          href={`/ideas/${idea.id}`}
          className="mt-1 inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          {idea.title} <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Artefatos</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {artifacts.map(([label, type, exists]) => (
            <div key={type} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                {exists && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    gerado
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {exists ? (
                  <>
                    <Link
                      href={`/ideas/${idea.id}/${type}`}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                    >
                      Ver
                    </Link>
                    <a
                      href={`/api/ideas/${idea.id}/${type}`}
                      download
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      <Download className="h-3.5 w-3.5" /> .md
                    </a>
                  </>
                ) : (
                  <Link
                    href={`/ideas/${idea.id}/${type}`}
                    className="text-xs text-neutral-400 underline-offset-4 hover:text-indigo-500 hover:underline"
                  >
                    gerar na ideia →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Config
function ConfigTab({
  project,
}: {
  project: { id: string; name: string; context: string };
}) {
  return (
    <div className="space-y-6">
      <form action={updateProjectContextAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <input type="hidden" name="id" value={project.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Nome</span>
          <input name="name" required defaultValue={project.name} className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Contexto</span>
          <textarea name="context" required rows={8} defaultValue={project.context} className="resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
        </label>
        <div>
          <SubmitButton pendingText="Salvando…" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
            Salvar
          </SubmitButton>
        </div>
      </form>

      <form action={deleteProjectAction} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <input type="hidden" name="id" value={project.id} />
        <SubmitButton pendingText="Excluindo…" className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40">
          Excluir projeto
        </SubmitButton>
      </form>
    </div>
  );
}
