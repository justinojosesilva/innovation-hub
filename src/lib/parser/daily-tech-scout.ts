// Parser for the "Daily Tech Scout" markdown report.
// Deterministic, regex-based — no LLM needed for ingestion.
//
// The report has two kinds of idea sections:
//  1. "🔥 Top Oportunidade do Dia"  -> one idea, rich fields, overall score only.
//  2. "💡 Ideias Encontradas"       -> N ideas, inline fields + 5-criteria table.

export type ParsedCriteria = {
  monetizacao: number | null;
  implementacao: number | null;
  stackFit: number | null;
  tendencia: number | null;
  diferencial: number | null;
};

export type ComplexityLevel = "BAIXA" | "MEDIA" | "ALTA";

export type ParsedIdea = {
  title: string;
  slug: string;
  category: string | null;
  source: string | null;
  sourceUrl: string | null;
  description: string | null; // "O que é"
  whyItMatters: string | null;
  howToImplement: string | null;
  monetization: string | null;
  problem: string | null;
  solution: string | null;
  audience: string | null;
  mvp: string | null;
  stack: string | null;
  complexity: ComplexityLevel | null;
  isTopOpportunity: boolean;
  rawSection: string;
  criteria: ParsedCriteria;
  reportScore: number | null; // overall score as printed
};

export type ParsedReport = {
  title: string | null;
  sourceDate: Date;
  ideas: ParsedIdea[];
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Date from filename (daily-tech-scout-YYYY-MM-DD.md), else footer DD/MM/YYYY, else now. */
export function extractDate(md: string, fileName: string): Date {
  const iso = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  }
  const br = md.match(/gerado automaticamente em\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (br) {
    return new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
  }
  return new Date();
}

const COMPLEXITY_MAP: Record<string, ComplexityLevel> = {
  "🟢": "BAIXA",
  "🟡": "MEDIA",
  "🔴": "ALTA",
  baixa: "BAIXA",
  media: "MEDIA",
  alta: "ALTA",
};

function parseComplexity(value: string): ComplexityLevel | null {
  const emoji = value.match(/🟢|🟡|🔴/);
  if (emoji) return COMPLEXITY_MAP[emoji[0]];
  const word = slugify(value).split("-")[0];
  return COMPLEXITY_MAP[word] ?? null;
}

/** First markdown/plain URL inside a string. */
function firstUrl(value: string): string | null {
  const md = value.match(/\]\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const bare = value.match(/(https?:\/\/[^\s)]+)/);
  return bare ? bare[1] : null;
}

/** Strip surrounding markdown link syntax, keep readable text. */
function cleanInline(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Extract single-line inline fields like `**Categoria:** value`.
 * Used for the "Ideias Encontradas" blocks where each field is one line.
 */
function inlineField(block: string, label: string): string | null {
  const re = new RegExp(
    `^\\*\\*${escapeRe(label)}:\\*\\*\\s*(.+)$`,
    "im"
  );
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Extract a labelled block whose content can span multiple lines, running
 * until the next `**Something:**` label or the end. Used for "Top Oportunidade".
 */
function multilineField(section: string, label: string): string | null {
  const re = new RegExp(
    `\\*\\*${escapeRe(label)}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*[^*\\n]+:\\*\\*|\\n---|$)`,
    "i"
  );
  const m = section.match(re);
  return m ? m[1].trim() : null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyCriteria(): ParsedCriteria {
  return {
    monetizacao: null,
    implementacao: null,
    stackFit: null,
    tendencia: null,
    diferencial: null,
  };
}

const CRITERION_KEYS: Record<string, keyof ParsedCriteria> = {
  monetizacao: "monetizacao",
  implementacao: "implementacao",
  "stack-fit": "stackFit",
  stack: "stackFit",
  tendencia: "tendencia",
  diferencial: "diferencial",
};

/**
 * Parse the score table:
 * | Critério | Nota | Peso | Parcial |
 * | Monetização | 8/10 | 30% | 2.4 |
 * ...
 * | **Total** | | | **8.3/10** |
 */
function parseScoreTable(block: string): {
  criteria: ParsedCriteria;
  reportScore: number | null;
} {
  const criteria = emptyCriteria();
  let reportScore: number | null = null;

  for (const line of block.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length === 0) continue;

    const label = cleanInline(cells[0]);
    const key = CRITERION_KEYS[slugify(label)];

    if (/total/i.test(label)) {
      const total = line.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      if (total) reportScore = parseFloat(total[1]);
      continue;
    }
    if (key) {
      const nota = cells[1]?.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      if (nota) criteria[key] = Math.round(parseFloat(nota[1]));
    }
  }

  return { criteria, reportScore };
}

/** Slice the report into `## ` sections keyed by a normalised heading. */
function sectionsByHeading(md: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = md.split(/^##\s+/m);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const body = nl === -1 ? "" : part.slice(nl + 1);
    out.set(slugify(heading), body);
  }
  return out;
}

// ---------------------------------------------------------------------------
// section parsers
// ---------------------------------------------------------------------------

function parseTopOpportunity(section: string): ParsedIdea | null {
  const nameRaw = multilineField(section, "Nome");
  if (!nameRaw) return null;
  const title = cleanInline(nameRaw);

  const scoreMatch = section.match(/\*\*Score:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  const monetization = multilineField(section, "Potencial de Monetização");

  // "MVP em 3 dias" / "MVP em N dias" — label varies by day count.
  const mvpMatch = section.match(/\*\*MVP[^:*]*:\*\*/);
  const mvp = mvpMatch
    ? multilineField(section, mvpMatch[0].replace(/\*\*|:/g, "").trim())
    : null;

  return {
    title,
    slug: slugify(title),
    category: "Top Oportunidade",
    source: null,
    sourceUrl: null,
    description: multilineField(section, "Solução"),
    whyItMatters: null,
    howToImplement: null,
    monetization,
    problem: multilineField(section, "Problema"),
    solution: multilineField(section, "Solução"),
    audience: multilineField(section, "Público-alvo"),
    mvp,
    stack: multilineField(section, "Stack sugerida"),
    complexity: null,
    isTopOpportunity: true,
    rawSection: section.trim(),
    criteria: emptyCriteria(),
    reportScore: scoreMatch ? parseFloat(scoreMatch[1]) : null,
  };
}

function parseFoundIdea(num: string, title: string, block: string): ParsedIdea {
  const sourceRaw = inlineField(block, "Fonte");
  const complexityRaw = inlineField(block, "Complexidade");
  const { criteria, reportScore } = parseScoreTable(block);

  return {
    title: cleanInline(title),
    slug: slugify(`${num}-${title}`),
    category: inlineField(block, "Categoria"),
    source: sourceRaw ? cleanInline(sourceRaw) : null,
    sourceUrl: sourceRaw ? firstUrl(sourceRaw) : null,
    description: stripField(inlineField(block, "O que é")),
    whyItMatters: stripField(inlineField(block, "Por que importa")),
    howToImplement: stripField(inlineField(block, "Como implementar")),
    monetization: stripField(inlineField(block, "Monetização")),
    problem: null,
    solution: null,
    audience: null,
    mvp: null,
    stack: null,
    complexity: complexityRaw ? parseComplexity(complexityRaw) : null,
    isTopOpportunity: false,
    rawSection: block.trim(),
    criteria,
    reportScore,
  };
}

function stripField(value: string | null): string | null {
  return value ? value.replace(/\*\*/g, "").trim() : null;
}

// ---------------------------------------------------------------------------
// entrypoint
// ---------------------------------------------------------------------------

export function parseDailyTechScout(md: string, fileName: string): ParsedReport {
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? cleanInline(titleMatch[1]) : null;
  const sourceDate = extractDate(md, fileName);

  const sections = sectionsByHeading(md);
  const ideas: ParsedIdea[] = [];

  // 1) Top Oportunidade do Dia
  for (const [key, body] of sections) {
    if (key.includes("top-oportunidade")) {
      const top = parseTopOpportunity(body);
      if (top) ideas.push(top);
      break;
    }
  }

  // 2) Ideias Encontradas — split on "### Ideia #N — Title"
  const found = [...sections].find(([key]) => key.includes("ideias-encontradas"));
  if (found) {
    const body = found[1];
    const blocks = body.split(/^###\s+Ideia\s+#/m).slice(1);
    for (const raw of blocks) {
      const header = raw.match(/^(\d+)\s*—\s*(.+)$/m);
      if (!header) continue;
      ideas.push(parseFoundIdea(header[1], header[2].trim(), raw));
    }
  }

  return { title, sourceDate, ideas };
}
