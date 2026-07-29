import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

// Module 7 — semantic dedup via LLM judge (Anthropic has no embeddings endpoint).
// The catalog is compared in BATCHES so a large catalog neither truncates the
// pairs JSON nor runs a single call long enough to hit the serverless timeout:
// ideas are split into chunks and every unordered pair of chunks is judged in
// its own bounded call. Uses Haiku — fast, cheap, and plenty for this judgment.
const DEDUP_MODEL = "claude-haiku-4-5";
const CHUNK_SIZE = 150; // ideas per chunk → each call judges at most 2×CHUNK_SIZE
const MAX_TOKENS = 32000; // Haiku streams up to 64k; 32k leaves ample headroom
const MIN_SIMILARITY = 50; // ignore weak matches

type IdeaLite = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  problem: string | null;
};

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

const SYSTEM = `Você analisa uma lista de ideias de produtos/negócios de tecnologia para detectar DUPLICATAS e SOBREPOSIÇÕES.

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
  batches: number;
  skipped: number; // batches that truncated and were skipped
};

// Judge one group of ideas (a chunk, or the union of two chunks). Returns the
// pairs mapped back to real idea ids. Returns null if the response truncated.
async function judgeGroup(
  client: Anthropic,
  group: IdeaLite[]
): Promise<{ ideaAId: string; ideaBId: string; pair: LlmPair }[] | null> {
  const catalog = group
    .map((idea, i) => {
      const summary = (idea.description ?? idea.problem ?? "").replace(/\s+/g, " ").slice(0, 220);
      return `#${i + 1} — ${idea.title}\n   categoria: ${idea.category ?? "—"}\n   resumo: ${summary}`;
    })
    .join("\n\n");

  const stream = client.messages.stream({
    model: DEDUP_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    messages: [{ role: "user", content: `Ideias (${group.length}):\n\n${catalog}` }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === "max_tokens") return null; // truncated → caller skips

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];

  let parsed: { pairs: LlmPair[] };
  try {
    parsed = JSON.parse(text.text) as { pairs: LlmPair[] };
  } catch {
    return null; // invalid JSON → treat as a skipped batch rather than aborting
  }

  return (parsed.pairs ?? [])
    .filter(
      (p) =>
        p.similarity >= MIN_SIMILARITY &&
        p.a >= 1 &&
        p.b >= 1 &&
        p.a <= group.length &&
        p.b <= group.length &&
        p.a !== p.b
    )
    .map((pair) => {
      const idA = group[pair.a - 1].id;
      const idB = group[pair.b - 1].id;
      const [ideaAId, ideaBId] = idA < idB ? [idA, idB] : [idB, idA];
      return { ideaAId, ideaBId, pair };
    });
}

export async function analyzeDuplicates(): Promise<DedupResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }

  const ideas: IdeaLite[] = await prisma.idea.findMany({
    where: { status: { not: "DESCARTADA" } }, // descartadas não entram no dedup
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, category: true, description: true, problem: true },
  });
  if (ideas.length < 2) return { analyzed: ideas.length, pairsFound: 0, batches: 0, skipped: 0 };

  // Split into chunks and judge every unordered pair of chunks (i ≤ j). This
  // covers every idea-pair exactly once across (i,i); cross-chunk pairs surface
  // in (i,j). The unique DuplicatePair key makes any overlap idempotent.
  const chunks: IdeaLite[][] = [];
  for (let i = 0; i < ideas.length; i += CHUNK_SIZE) {
    chunks.push(ideas.slice(i, i + CHUNK_SIZE));
  }

  const client = new Anthropic();
  const seen = new Set<string>(); // distinct pair keys stored this run
  let batches = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i++) {
    for (let j = i; j < chunks.length; j++) {
      batches++;
      const group = i === j ? chunks[i] : [...chunks[i], ...chunks[j]];
      const results = await judgeGroup(client, group);
      if (results === null) {
        skipped++;
        continue;
      }
      for (const { ideaAId, ideaBId, pair } of results) {
        await prisma.duplicatePair.upsert({
          where: { ideaAId_ideaBId: { ideaAId, ideaBId } },
          // Don't reset a status the user already acted on.
          update: {
            similarity: pair.similarity,
            rationale: pair.rationale,
            recommendation: pair.recommendation,
          },
          create: {
            ideaAId,
            ideaBId,
            similarity: pair.similarity,
            rationale: pair.rationale,
            recommendation: pair.recommendation,
          },
        });
        seen.add(`${ideaAId}:${ideaBId}`);
      }
    }
  }

  return { analyzed: ideas.length, pairsFound: seen.size, batches, skipped };
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
