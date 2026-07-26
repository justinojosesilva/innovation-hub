import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getGenModel } from "@/lib/settings";

// Modules 8 & 9 — AI-generated Business Model Canvas + PRD + SDD.
// The model is configurable in Settings (default Opus 4.8).

type IdeaForGen = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  whyItMatters: string | null;
  howToImplement: string | null;
  monetization: string | null;
  problem: string | null;
  solution: string | null;
  audience: string | null;
  mvp: string | null;
  stack: string | null;
};

const CANVAS_FIELDS = [
  ["valuePropositions", "Proposta de Valor"],
  ["customerSegments", "Segmentos de Clientes"],
  ["channels", "Canais"],
  ["customerRelationships", "Relacionamento"],
  ["revenueStreams", "Fontes de Receita"],
  ["keyResources", "Recursos-Chave"],
  ["keyActivities", "Atividades-Chave"],
  ["keyPartners", "Parcerias-Chave"],
  ["costStructure", "Estrutura de Custos"],
] as const;

export type CanvasBlocks = Record<(typeof CANVAS_FIELDS)[number][0], string[]>;
export const CANVAS_LABELS = Object.fromEntries(CANVAS_FIELDS) as Record<string, string>;

function ideaContext(idea: IdeaForGen): string {
  const parts: [string, string | null][] = [
    ["Título", idea.title],
    ["Categoria", idea.category],
    ["O que é", idea.description],
    ["Problema", idea.problem],
    ["Solução", idea.solution],
    ["Público-alvo", idea.audience],
    ["Por que importa", idea.whyItMatters],
    ["Como implementar", idea.howToImplement],
    ["MVP", idea.mvp],
    ["Stack", idea.stack],
    ["Monetização", idea.monetization],
  ];
  return parts
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

async function fetchIdea(ideaId: string): Promise<IdeaForGen> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      whyItMatters: true,
      howToImplement: true,
      monetization: true,
      problem: true,
      solution: true,
      audience: true,
      mvp: true,
      stack: true,
    },
  });
  if (!idea) throw new Error("Ideia não encontrada");
  return idea;
}

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }
  return new Anthropic();
}

const CANVAS_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    CANVAS_FIELDS.map(([key]) => [
      key,
      { type: "array", items: { type: "string" } },
    ])
  ),
  required: CANVAS_FIELDS.map(([key]) => key),
  additionalProperties: false,
} as const;

// Core generation (no persistence) — works off any IdeaForGen-shaped subject,
// so it serves both real ideas and synthesized clusters.
async function buildCanvasBlocks(subject: IdeaForGen): Promise<{ blocks: CanvasBlocks; model: string }> {
  const model = await getGenModel();
  const msg = await client().messages.create({
    model,
    max_tokens: 4000,
    system:
      "Você é estrategista de produto. Gere um Business Model Canvas conciso e acionável em português para a ideia descrita. Cada bloco deve ter de 2 a 5 itens objetivos (frases curtas), específicos para esta ideia — nada genérico.",
    messages: [{ role: "user", content: ideaContext(subject) }],
    output_config: { format: { type: "json_schema", schema: CANVAS_SCHEMA } },
  });
  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Resposta vazia");
  return { blocks: JSON.parse(text.text) as CanvasBlocks, model };
}

async function buildPRDMarkdown(subject: IdeaForGen): Promise<{ markdown: string; model: string }> {
  const model = await getGenModel();
  const stream = client().messages.stream({
    model,
    max_tokens: 12000,
    system: `Você é Product Manager sênior. Escreva um PRD (Product Requirements Document) claro e acionável em português (markdown) para a ideia descrita.

Estruture com estas seções (use ## para títulos):
## Visão
## Problema
## Objetivos & Métricas de Sucesso
## Público-alvo & Personas
## Requisitos Funcionais
## User Stories (formato: Como <persona>, quero <ação>, para <benefício>)
## Escopo do MVP
## Fora de Escopo (v1)
## Roadmap (fases)
## Riscos & Mitigações

Seja específico para esta ideia. Responda APENAS com o documento em markdown, sem preâmbulo nem comentários finais.`,
    messages: [{ role: "user", content: ideaContext(subject) }],
  });
  const msg = await stream.finalMessage();
  const text = msg.content.find((b) => b.type === "text");
  const markdown = text && text.type === "text" ? text.text : "";
  if (!markdown) throw new Error("Resposta vazia");
  return { markdown, model };
}

export async function generateCanvas(ideaId: string) {
  const { blocks, model } = await buildCanvasBlocks(await fetchIdea(ideaId));
  await prisma.generatedDoc.upsert({
    where: { ideaId_type: { ideaId, type: "CANVAS" } },
    update: { content: JSON.stringify(blocks), model },
    create: { ideaId, type: "CANVAS", content: JSON.stringify(blocks), model },
  });
  return blocks;
}

export async function generatePRD(ideaId: string) {
  const { markdown, model } = await buildPRDMarkdown(await fetchIdea(ideaId));
  await prisma.generatedDoc.upsert({
    where: { ideaId_type: { ideaId, type: "PRD" } },
    update: { content: markdown, model },
    create: { ideaId, type: "PRD", content: markdown, model },
  });
  return markdown;
}

// ---- Cluster (Sínteses) variants: generate Canvas/PRD for a synthesized concept.
async function clusterToSubject(clusterId: string): Promise<IdeaForGen> {
  const c = await prisma.ideaCluster.findUnique({ where: { id: clusterId } });
  if (!c || !c.synthName) throw new Error("Sintetize o grupo antes de gerar artefatos.");
  const features = c.synthFeatures.length
    ? `\n\nFuncionalidades:\n- ${c.synthFeatures.join("\n- ")}`
    : "";
  return {
    id: c.id,
    title: c.synthName,
    category: c.theme,
    description: (c.synthValueProp ?? "") + features,
    whyItMatters: c.synthDifferential,
    howToImplement: null,
    monetization: null,
    problem: null,
    solution: null,
    audience: null,
    mvp: c.synthMvp,
    stack: null,
  };
}

export async function generateClusterCanvas(clusterId: string) {
  const { blocks, model } = await buildCanvasBlocks(await clusterToSubject(clusterId));
  await prisma.generatedDoc.upsert({
    where: { clusterId_type: { clusterId, type: "CANVAS" } },
    update: { content: JSON.stringify(blocks), model },
    create: { clusterId, type: "CANVAS", content: JSON.stringify(blocks), model },
  });
  return blocks;
}

export async function generateClusterPRD(clusterId: string) {
  const { markdown, model } = await buildPRDMarkdown(await clusterToSubject(clusterId));
  await prisma.generatedDoc.upsert({
    where: { clusterId_type: { clusterId, type: "PRD" } },
    update: { content: markdown, model },
    create: { clusterId, type: "PRD", content: markdown, model },
  });
  return markdown;
}

export async function getClusterDoc(clusterId: string, type: "CANVAS" | "PRD") {
  return prisma.generatedDoc.findUnique({
    where: { clusterId_type: { clusterId, type } },
  });
}

export async function generateSDD(ideaId: string) {
  const GEN_MODEL = await getGenModel();
  const idea = await fetchIdea(ideaId);
  const features = await prisma.feature.findMany({
    where: { ideaId },
    select: { title: true, description: true },
    orderBy: { createdAt: "asc" },
  });
  const featureText =
    features.length > 0
      ? `\n\nFuncionalidades já propostas (especifique-as):\n${features
          .map((f) => `- ${f.title}${f.description ? `: ${f.description}` : ""}`)
          .join("\n")}`
      : "";

  const stream = client().messages.stream({
    model: GEN_MODEL,
    max_tokens: 14000,
    system: `Você é engenheiro de software sênior. Escreva um SDD (Spec-Driven Development) — uma especificação TÉCNICA acionável em português (markdown) para a ideia descrita. É o documento de engenharia (complementa o PRD de produto).

Estruture com estas seções (use ## para títulos):
## Visão Técnica
## Arquitetura (componentes, fluxo, integrações)
## Modelo de Dados (entidades e campos principais)
## Contratos & APIs (endpoints/interfaces principais)
## Especificação das Funcionalidades
## Decisões Técnicas & Trade-offs
## Critérios de Aceite (testáveis)
## Plano de Implementação (tarefas em ordem)
## Riscos Técnicos & Mitigações

Seja concreto e específico para esta ideia. Responda APENAS com o documento em markdown, sem preâmbulo.`,
    messages: [{ role: "user", content: ideaContext(idea) + featureText }],
  });

  const msg = await stream.finalMessage();
  const text = msg.content.find((b) => b.type === "text");
  const markdown = text && text.type === "text" ? text.text : "";
  if (!markdown) throw new Error("Resposta vazia");

  await prisma.generatedDoc.upsert({
    where: { ideaId_type: { ideaId, type: "SDD" } },
    update: { content: markdown, model: GEN_MODEL },
    create: { ideaId, type: "SDD", content: markdown, model: GEN_MODEL },
  });
  return markdown;
}

/** Serialize a stored Canvas (JSON) into markdown for download. */
export function canvasToMarkdown(blocks: CanvasBlocks, title: string): string {
  let md = `# Business Model Canvas — ${title}\n`;
  for (const [key, label] of CANVAS_FIELDS) {
    md += `\n## ${label}\n`;
    for (const item of blocks[key] ?? []) md += `- ${item}\n`;
  }
  return md;
}

export async function getDoc(ideaId: string, type: "CANVAS" | "PRD" | "SDD") {
  return prisma.generatedDoc.findUnique({
    where: { ideaId_type: { ideaId, type } },
  });
}

export async function getDocFlags(ideaId: string) {
  const docs = await prisma.generatedDoc.findMany({
    where: { ideaId },
    select: { type: true },
  });
  const types = new Set(docs.map((d) => d.type));
  return {
    hasCanvas: types.has("CANVAS"),
    hasPrd: types.has("PRD"),
    hasSdd: types.has("SDD"),
  };
}
