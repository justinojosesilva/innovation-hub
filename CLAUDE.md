@AGENTS.md

# Innovation Hub

Plataforma que captura, organiza e prioriza ideias geradas pela task **Daily Tech Scout**
(roda 08:00, gera um `.md`/dia). Responde "qual ideia vale meu tempo?".

## Stack
Next.js 16 (App Router, `src/`) · React 19 · Tailwind 4 · Prisma 7 + Postgres (pgvector) · pnpm.

## Dev
```bash
pnpm db:up         # sobe Postgres (docker, host:5433)
pnpm db:migrate    # prisma migrate dev
pnpm run import    # importa os .md de REPORTS_DIR  (NÃO use `pnpm import` — é comando embutido)
pnpm dev           # http://localhost:3000  (/ e /ranking)
```

## Prisma 7 — atenção (difere de v5/v6)
- Generator `prisma-client` com `output = ../src/generated/prisma` (gitignored, não em node_modules).
- Importar de `@/generated/prisma/client`, não `@prisma/client`.
- Runtime usa driver adapter `@prisma/adapter-pg` (ver `src/lib/db.ts`).
- URL de conexão do CLI fica em `prisma.config.ts`, não no `schema.prisma`.

## Arquitetura (slice 1: importer + ranking)
- `src/lib/parser/daily-tech-scout.ts` — parser determinístico (regex) do relatório.
- `src/lib/import.ts` + `scripts/import.ts` — import idempotente (sha256 por arquivo).
- `src/lib/scoring.ts` — fórmula de score (pesos renormalizados).
- `src/lib/ranking.ts` — ranking ordenado, score calculado in-app (re-rank ao vivo).
- `src/app/ranking/` — tela com filtros + sliders de peso.
- `POST /api/import` — endpoint pro cron das 08:00.

Modelos: `Report`, `Idea`, `IdeaScore`, `IdeaNote` (M3 groundwork), `ScoreWeights` (singleton id=1).
Embedding/pgvector p/ dedup semântico fica pro slice 2.
