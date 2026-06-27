import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getGenModel } from "@/lib/settings";
import { slugify } from "@/lib/parser/daily-tech-scout";
import { awardIdeaCreated } from "@/lib/gamification";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }
  return new Anthropic();
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Não consegui interpretar a resposta da IA (JSON inválido). Tente novamente.");
  }
}

// ---------------------------------------------------------------- clustering
const CLUSTER_SCHEMA = {
  type: "object",
  properties: {
    clusters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          rationale: { type: "string" },
          ideaIndices: { type: "array", items: { type: "integer" } },
        },
        required: ["theme", "rationale", "ideaIndices"],
        additionalProperties: false,
      },
    },
  },
  required: ["clusters"],
  additionalProperties: false,
} as const;

type LlmCluster = { theme: string; rationale: string; ideaIndices: number[] };

export async function clusterIdeas(): Promise<{ analyzed: number; clusters: number }> {
  const ideas = await prisma.idea.findMany({
    where: { status: { not: "DESCARTADA" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, category: true, description: true, problem: true },
  });
  if (ideas.length < 2) return { analyzed: ideas.length, clusters: 0 };

  const catalog = ideas
    .map((idea, i) => {
      const summary = (idea.description ?? idea.problem ?? "").replace(/\s+/g, " ").slice(0, 180);
      return `#${i + 1} — ${idea.title} [${idea.category ?? "—"}]\n   ${summary}`;
    })
    .join("\n\n");

  const stream = client().messages.stream({
    model: await getGenModel(),
    max_tokens: 16000,
    system: `Você agrupa ideias de produtos/negócios em CLUSTERS temáticos — ideias que, juntas, poderiam virar um sistema maior e mais robusto (mesmo domínio, problema ou público).

Para cada cluster retorne: theme (nome curto do grupo), rationale (1 frase do porquê se agrupam) e ideaIndices (os números das ideias). Cada cluster deve ter ao menos 2 ideias. Uma ideia entra em no máximo 1 cluster; ideias sem grupo claro ficam de fora. Foque em poucos grupos coesos.`,
    messages: [{ role: "user", content: `Catálogo (${ideas.length} ideias):\n\n${catalog}` }],
    output_config: { format: { type: "json_schema", schema: CLUSTER_SCHEMA } },
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === "max_tokens") {
    throw new Error("Catálogo grande demais (resposta truncada). Descarte ideias antigas ou rode em lotes.");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return { analyzed: ideas.length, clusters: 0 };

  const parsed = parseJson<{ clusters: LlmCluster[] }>(text.text);
  const valid = (parsed.clusters ?? [])
    .map((c) => ({
      ...c,
      ideaIds: c.ideaIndices
        .filter((n) => n >= 1 && n <= ideas.length)
        .map((n) => ideas[n - 1].id),
    }))
    .filter((c) => c.ideaIds.length >= 2);

  // Re-clustering replaces the existing groups (saved ideas persist independently).
  await prisma.ideaCluster.deleteMany({});
  for (const c of valid) {
    await prisma.ideaCluster.create({
      data: {
        theme: c.theme,
        rationale: c.rationale,
        ideas: { connect: c.ideaIds.map((id) => ({ id })) },
      },
    });
  }
  return { analyzed: ideas.length, clusters: valid.length };
}

// ---------------------------------------------------------------- synthesis
const SYNTH_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    valueProp: { type: "string" },
    differential: { type: "string" },
    mvp: { type: "string" },
    features: { type: "array", items: { type: "string" } },
    scores: {
      type: "object",
      properties: {
        monetizacao: { type: "integer" },
        implementacao: { type: "integer" },
        stackFit: { type: "integer" },
        tendencia: { type: "integer" },
        diferencial: { type: "integer" },
      },
      required: ["monetizacao", "implementacao", "stackFit", "tendencia", "diferencial"],
      additionalProperties: false,
    },
  },
  required: ["name", "valueProp", "differential", "mvp", "features", "scores"],
  additionalProperties: false,
} as const;

type Synth = {
  name: string;
  valueProp: string;
  differential: string;
  mvp: string;
  features: string[];
  scores: {
    monetizacao: number;
    implementacao: number;
    stackFit: number;
    tendencia: number;
    diferencial: number;
  };
};

export async function synthesizeCluster(clusterId: string): Promise<void> {
  const cluster = await prisma.ideaCluster.findUnique({
    where: { id: clusterId },
    include: {
      ideas: {
        select: { title: true, description: true, problem: true, monetization: true, stack: true },
      },
    },
  });
  if (!cluster) throw new Error("Grupo não encontrado");

  const ideasText = cluster.ideas
    .map((i, n) => {
      const what = (i.description ?? i.problem ?? "").replace(/\s+/g, " ").slice(0, 260);
      return `${n + 1}. ${i.title}\n   ${what}${i.monetization ? `\n   monetização: ${i.monetization.slice(0, 120)}` : ""}`;
    })
    .join("\n\n");

  const stream = client().messages.stream({
    model: await getGenModel(),
    max_tokens: 4000,
    system: `Você é estrategista de produto. Dado um grupo de ideias relacionadas, sintetize UM sistema unificado e robusto que combine o melhor de todas.

Retorne: name (nome do produto), valueProp (proposta de valor unificada, 2-3 frases), differential (o que o torna único), mvp (escopo enxuto de MVP), features (lista das funcionalidades combinadas, frases curtas) e scores (notas 0-10 para monetizacao, implementacao, stackFit, tendencia, diferencial do sistema unificado). Seja concreto.`,
    messages: [{ role: "user", content: `Tema: ${cluster.theme}\n\nIdeias:\n\n${ideasText}` }],
    output_config: { format: { type: "json_schema", schema: SYNTH_SCHEMA } },
  });
  const response = await stream.finalMessage();
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Resposta vazia");
  const s = parseJson<Synth>(text.text);

  await prisma.ideaCluster.update({
    where: { id: clusterId },
    data: {
      synthName: s.name,
      synthValueProp: s.valueProp,
      synthDifferential: s.differential,
      synthMvp: s.mvp,
      synthFeatures: s.features,
      synthScores: s.scores,
      synthesizedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------- save as idea
const clampScore = (n: unknown) =>
  typeof n === "number" ? Math.max(0, Math.min(10, Math.round(n))) : null;

export async function saveClusterAsIdea(clusterId: string): Promise<string | null> {
  const cluster = await prisma.ideaCluster.findUnique({ where: { id: clusterId } });
  if (!cluster || !cluster.synthName) return null;
  if (cluster.savedIdeaId) {
    const exists = await prisma.idea.findUnique({ where: { id: cluster.savedIdeaId } });
    if (exists) return cluster.savedIdeaId;
  }

  const scores = (cluster.synthScores ?? {}) as Record<string, number>;
  const memberCount = await prisma.ideaCluster
    .findUnique({ where: { id: clusterId }, select: { _count: { select: { ideas: true } } } })
    .then((c) => c?._count.ideas ?? 0);

  const idea = await prisma.idea.create({
    data: {
      title: cluster.synthName,
      slug: slugify(`sintese-${cluster.synthName}`),
      category: cluster.theme,
      source: `Síntese de ${memberCount} ideias`,
      description: cluster.synthValueProp,
      whyItMatters: cluster.synthDifferential,
      mvp: cluster.synthMvp,
      status: "NOVA",
      discoveredAt: new Date(),
      rawSection: cluster.synthValueProp ?? cluster.synthName,
      score: {
        create: {
          monetizacao: clampScore(scores.monetizacao),
          implementacao: clampScore(scores.implementacao),
          stackFit: clampScore(scores.stackFit),
          tendencia: clampScore(scores.tendencia),
          diferencial: clampScore(scores.diferencial),
        },
      },
      features: {
        create: cluster.synthFeatures.map((title) => ({
          title,
          source: "Da síntese",
        })),
      },
    },
  });

  await awardIdeaCreated(idea.id);
  await prisma.ideaCluster.update({
    where: { id: clusterId },
    data: { savedIdeaId: idea.id },
  });
  return idea.id;
}

// ---------------------------------------------------------------- reads
export async function getClusters() {
  return prisma.ideaCluster.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      ideas: { select: { id: true, title: true } },
    },
  });
}

export async function getCluster(id: string) {
  return prisma.ideaCluster.findUnique({
    where: { id },
    include: {
      ideas: { select: { id: true, title: true, category: true } },
    },
  });
}
