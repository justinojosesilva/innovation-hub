import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getGenModel } from "@/lib/settings";
import { slugify } from "@/lib/parser/daily-tech-scout";

export const FINFLOW_ID = "finflow";

const FINFLOW_CONTEXT = `FinFlow — Plataforma inteligente de gestão financeira pessoal, familiar e gamificada (web fullstack, Next.js).

O que faz: une controle financeiro pessoal e familiar, planejamento, gestão patrimonial, gestão de dívidas, metas financeiras, gamificação comportamental e inteligência financeira baseada em dados. Diferencial: não só registra o passado — projeta o futuro (3/6/12 meses), ajuda na decisão, incentiva hábitos saudáveis e suporta o contexto familiar/compartilhado.

Responde perguntas como: como estou hoje e como estarei daqui a meses; estou gastando demais; quando saio das dívidas; estou preparado para emergências; minha família está saudável financeiramente; quais hábitos melhorar.

Público: pessoa física (assalariados, autônomos, motoristas de app, freelancers, investidores iniciantes), casais (controle conjunto, metas), famílias (controle compartilhado, educação financeira) e pequenos empreendedores (separar pessoal/negócio, caixa simples).`;

export async function ensureFinflow() {
  return prisma.project.upsert({
    where: { id: FINFLOW_ID },
    update: { context: FINFLOW_CONTEXT, name: "FinFlow" },
    create: { id: FINFLOW_ID, name: "FinFlow", context: FINFLOW_CONTEXT },
  });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

/** The project promoted from this idea, if any. */
export async function getProjectFromIdea(ideaId: string) {
  return prisma.project.findFirst({
    where: { sourceIdeaId: ideaId },
    select: { id: true, name: true },
  });
}

/**
 * Promote a matured idea (status PRODUCAO) into a Project. Idempotent: returns
 * the existing project if already promoted. The idea's features seed the context.
 */
export async function promoteIdeaToProject(ideaId: string): Promise<string | null> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { features: { select: { title: true, description: true } } },
  });
  if (!idea || idea.status !== "PRODUCAO") return null;

  const existing = await prisma.project.findFirst({ where: { sourceIdeaId: ideaId } });
  if (existing) return existing.id;

  const parts: (string | null)[] = [
    idea.description,
    idea.problem && `Problema: ${idea.problem}`,
    idea.solution && `Solução: ${idea.solution}`,
    idea.audience && `Público: ${idea.audience}`,
    idea.stack && `Stack: ${idea.stack}`,
    idea.monetization && `Monetização: ${idea.monetization}`,
  ];
  const context = parts.filter(Boolean).join("\n\n");

  const base = slugify(idea.title) || "projeto";
  let id = base;
  for (let n = 2; await prisma.project.findUnique({ where: { id } }); n++) {
    id = `${base}-${n}`;
  }

  await prisma.project.create({
    data: {
      id,
      name: idea.title,
      context: context || idea.title,
      status: "BUILDING",
      sourceIdeaId: ideaId,
      // The idea's features become the new project's backlog.
      features: {
        create: idea.features.map((f) => ({
          title: f.title,
          description: f.description,
          source: "Da ideia de origem",
        })),
      },
      updates: {
        create: { kind: "marco", body: `Projeto criado a partir da ideia "${idea.title}".` },
      },
    },
  });
  return id;
}

export async function getProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { fits: true } } },
  });
}

type LlmFit = {
  index: number;
  applicable: boolean;
  impact: "ALTO" | "MEDIO" | "BAIXO";
  roi: "ALTO" | "MEDIO" | "BAIXO";
  effortWeeks: number;
  rationale: string;
};

const LEVEL = { ALTO: "ALTO", MEDIO: "MEDIO", BAIXO: "BAIXO" } as const;

const SCHEMA = {
  type: "object",
  properties: {
    fits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          applicable: { type: "boolean" },
          impact: { type: "string", enum: ["ALTO", "MEDIO", "BAIXO"] },
          roi: { type: "string", enum: ["ALTO", "MEDIO", "BAIXO"] },
          effortWeeks: { type: "integer" },
          rationale: { type: "string" },
        },
        required: ["index", "applicable", "impact", "roi", "effortWeeks", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["fits"],
  additionalProperties: false,
} as const;

export async function evaluateProjectFits(projectId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Projeto não encontrado");

  const ideas = await prisma.idea.findMany({
    where: { status: { not: "DESCARTADA" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, category: true, description: true, problem: true, monetization: true },
  });
  if (ideas.length === 0) return { applicable: 0 };

  const catalog = ideas
    .map((idea, i) => {
      const what = (idea.description ?? idea.problem ?? "").replace(/\s+/g, " ").slice(0, 200);
      return `#${i + 1} — ${idea.title} [${idea.category ?? "—"}]\n   ${what}`;
    })
    .join("\n\n");

  const system = `Você é consultor de produto. Avalie cada ideia do catálogo quanto a ser aproveitada como FUNCIONALIDADE do projeto abaixo (não como produto separado).

PROJETO:
${project.context}

Para cada ideia retorne:
- index: número da ideia
- applicable: true se faz sentido virar feature/integração deste projeto, false caso contrário
- impact: ALTO | MEDIO | BAIXO (impacto esperado no projeto)
- roi: ALTO | MEDIO | BAIXO (retorno vs. esforço)
- effortWeeks: estimativa realista de semanas para integrar (número inteiro)
- rationale: 1 frase curta em português conectando a ideia ao projeto

Seja honesto: marque applicable=false para ideias sem encaixo real. Não force.`;

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: await getGenModel(),
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: `Catálogo (${ideas.length} ideias):\n\n${catalog}` }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return { applicable: 0 };
  const parsed = JSON.parse(text.text) as { fits: LlmFit[] };

  const applicable = (parsed.fits ?? []).filter(
    (f) => f.applicable && f.index >= 1 && f.index <= ideas.length
  );

  // Re-eval replaces the project's fits.
  await prisma.$transaction([
    prisma.projectFit.deleteMany({ where: { projectId } }),
    ...applicable.map((f) =>
      prisma.projectFit.create({
        data: {
          ideaId: ideas[f.index - 1].id,
          projectId,
          impact: LEVEL[f.impact] ?? "MEDIO",
          roi: LEVEL[f.roi] ?? "MEDIO",
          effortWeeks: Math.max(1, f.effortWeeks || 1),
          rationale: f.rationale,
        },
      })
    ),
  ]);

  return { applicable: applicable.length };
}

const ROI_RANK = { ALTO: 3, MEDIO: 2, BAIXO: 1 } as const;

export async function getProjectFits(projectId: string) {
  const fits = await prisma.projectFit.findMany({
    where: { projectId },
    include: { idea: { select: { id: true, title: true, category: true, status: true } } },
  });
  return fits.sort(
    (a, b) =>
      (ROI_RANK[b.roi as keyof typeof ROI_RANK] ?? 0) - (ROI_RANK[a.roi as keyof typeof ROI_RANK] ?? 0) ||
      (ROI_RANK[b.impact as keyof typeof ROI_RANK] ?? 0) - (ROI_RANK[a.impact as keyof typeof ROI_RANK] ?? 0) ||
      a.effortWeeks - b.effortWeeks
  );
}

export async function getFitsForIdea(ideaId: string) {
  return prisma.projectFit.findMany({
    where: { ideaId },
    include: { project: { select: { id: true, name: true } } },
  });
}
