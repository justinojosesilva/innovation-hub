import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getGenModel } from "@/lib/settings";

// Module 7 — semantic dedup via LLM judge (Anthropic has no embeddings endpoint;
// at this catalog size one LLM call beats embeddings+pgvector infra).
const MIN_SIMILARITY = 50; // ignore weak matches

type LlmPair = {
  a: number;
  b: number;
  similarity: number;
  rationale: string;
  recommendation: "MERGE" | "RELATED" | "DISTINCT";
};

const SCHEMA = {
  type: "object",
  properties: {
    pairs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          a: { type: "integer" },
          b: { type: "integer" },
          similarity: { type: "integer" },
          rationale: { type: "string" },
          recommendation: { type: "string", enum: ["MERGE", "RELATED", "DISTINCT"] },
        },
        required: ["a", "b", "similarity", "rationale", "recommendation"],
        additionalProperties: false,
      },
    },
  },
  required: ["pairs"],
  additionalProperties: false,
} as const;

const SYSTEM = `Você analisa um catálogo de ideias de produtos/negócios de tecnologia para detectar DUPLICATAS e SOBREPOSIÇÕES.

Cada ideia tem um número (#), título, categoria e resumo. Encontre pares de ideias que tratam do MESMO problema/produto central ou se sobrepõem fortemente.

Para cada par relevante retorne:
- a, b: os números das duas ideias (a < b)
- similarity: 0 a 100 (quão sobrepostas são em problema/solução/mercado)
- rationale: 1 frase curta em português explicando a sobreposição
- recommendation: "MERGE" (praticamente a mesma ideia, fundir), "RELATED" (relacionadas/complementares, manter separadas mas vincular) ou "DISTINCT" (pouca sobreposição real)

Só inclua pares com similarity >= 50. Não invente pares triviais. Seja criterioso.`;

export type DedupResult = {
  analyzed: number;
  pairsFound: number;
};

export async function analyzeDuplicates(): Promise<DedupResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }

  const ideas = await prisma.idea.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, category: true, description: true, problem: true },
  });

  if (ideas.length < 2) return { analyzed: ideas.length, pairsFound: 0 };

  // Compact, index-based catalog (keeps tokens low, hides internal ids).
  const catalog = ideas
    .map((idea, i) => {
      const summary = (idea.description ?? idea.problem ?? "").replace(/\s+/g, " ").slice(0, 220);
      return `#${i + 1} — ${idea.title}\n   categoria: ${idea.category ?? "—"}\n   resumo: ${summary}`;
    })
    .join("\n\n");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: await getGenModel(),
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: `Catálogo (${ideas.length} ideias):\n\n${catalog}` }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return { analyzed: ideas.length, pairsFound: 0 };

  const parsed = JSON.parse(text.text) as { pairs: LlmPair[] };
  const pairs = (parsed.pairs ?? []).filter(
    (p) =>
      p.similarity >= MIN_SIMILARITY &&
      p.a >= 1 &&
      p.b >= 1 &&
      p.a <= ideas.length &&
      p.b <= ideas.length &&
      p.a !== p.b
  );

  let stored = 0;
  for (const p of pairs) {
    const idA = ideas[p.a - 1].id;
    const idB = ideas[p.b - 1].id;
    // Canonical ordering so the unique key is stable regardless of a/b order.
    const [ideaAId, ideaBId] = idA < idB ? [idA, idB] : [idB, idA];

    await prisma.duplicatePair.upsert({
      where: { ideaAId_ideaBId: { ideaAId, ideaBId } },
      // Don't reset a status the user already acted on.
      update: {
        similarity: p.similarity,
        rationale: p.rationale,
        recommendation: p.recommendation,
      },
      create: {
        ideaAId,
        ideaBId,
        similarity: p.similarity,
        rationale: p.rationale,
        recommendation: p.recommendation,
      },
    });
    stored++;
  }

  return { analyzed: ideas.length, pairsFound: stored };
}

export async function getDuplicatePairs() {
  return prisma.duplicatePair.findMany({
    orderBy: [{ status: "asc" }, { similarity: "desc" }],
    include: {
      ideaA: { select: { id: true, title: true, status: true } },
      ideaB: { select: { id: true, title: true, status: true } },
    },
  });
}
