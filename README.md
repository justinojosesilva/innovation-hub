<div align="center">

# 💡 Innovation Hub

**Transforma tendências tecnológicas em produtos reais.**

Uma plataforma que captura, organiza e prioriza as ideias geradas diariamente pela task
_Daily Tech Scout_ — e responde à única pergunta que importa quando você tem centenas de
ideias acumuladas: **“qual delas vale o meu tempo?”**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude](https://img.shields.io/badge/AI-Claude-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com)

</div>

---

## 📖 O problema

Uma automação (_Daily Tech Scout_) roda às 08:00 todo dia e cospe um relatório `.md` com
dezenas de ideias de produto. Em poucas semanas são **centenas** de ideias soltas em
arquivos — impossível de comparar, priorizar ou evoluir manualmente.

O **Innovation Hub** ingere esses relatórios e vira o painel de comando dessas ideias:
pontua, ranqueia, deduplica, agrupa, gera artefatos de produto (Canvas, PRD, SDD) e
acompanha as que viraram projeto — tudo em um só lugar.

## ✨ Funcionalidades

| Módulo | O que faz |
| --- | --- |
| 📥 **Importador** | Ingestão idempotente (sha256) dos `.md` do Daily Tech Scout via upload ou script. Parser determinístico por regex — sem custo de IA. |
| 🏆 **Ranking & Score** | Score ponderado por 5 critérios (monetização, implementação, stack-fit, tendência, diferencial) com **sliders que re-rankeiam ao vivo** e filtro por dia do relatório. |
| 🗂️ **Banco de ideias + CRM** | Detalhe da ideia com funil de status (6 estágios), reações 👍/👎, notas, checklist de maturação por fase e breakdown de score. |
| 📡 **Radar de tendências** | Extrai temas das categorias, mede frequência nos relatórios e plota a evolução no tempo. |
| 🧭 **Roadmap** | Board kanban do pipeline (Nova → Avaliação → Validação → MVP → Produção) com sinais de prontidão. |
| 🔀 **Dedup semântico** | Detecta duplicatas via **LLM-judge (Claude)**, em lotes para escalar; mesclar preserva a perdedora como _feature_ da sobrevivente. |
| 🧩 **Sínteses** | Agrupa ideias por tema e **compõe um sistema unificado** a partir do grupo — com Canvas/PRD próprios e curadoria manual dos membros. |
| 📄 **Artefatos de IA** | Gera **Business Model Canvas**, **PRD** e **SDD** por ideia (ou por síntese) com Claude, exportáveis em `.md`. |
| 📊 **Projetos** | Workspace de acompanhamento: backlog kanban, diário, KPIs com gráficos, marcos/roadmap e saúde derivada da atividade. |
| 🎯 **Aplicabilidade** | Avalia (via IA) quais ideias servem como _feature_ de um projeto existente, ranqueadas por ROI. |
| 🏅 **Gamificação** | XP event-sourced, níveis e conquistas por marcos (catalogar, validar, MVP, produção, features, marcos). |
| ⚙️ **Configurável** | Seletor do modelo de IA (Opus / Sonnet / Haiku) em runtime. |

## 🏗️ Arquitetura

```
Daily Tech Scout (08:00)          Innovation Hub
        │                    ┌───────────────────────────────────────┐
        │  relatório .md     │  Parser (regex, determinístico)        │
        └───────────────────▶│  → Import idempotente (sha256)         │
                             │  → Score ponderado + Ranking ao vivo   │
                             │  → IA (Claude): dedup · síntese ·       │
                             │       Canvas · PRD · SDD · fit          │
                             │  → Projetos · Gamificação · Radar       │
                             └───────────────────────────────────────┘
                                   Next.js (App Router, RSC + Server Actions)
                                   Prisma 7  ·  PostgreSQL (Neon)
```

- **Sem estado no cliente para escrita** — tudo via **Server Actions** e re-render do servidor.
- **IA sob demanda** — o parser e o score são determinísticos (custo zero); Claude entra só
  onde agrega (dedup, síntese, artefatos, aplicabilidade), com modelo configurável.
- **Dedup em lotes** — a análise fatia o catálogo em blocos e julga pares de blocos, para
  escalar sem estourar o limite de tokens.

## 🛠️ Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Components + Actions) · [React 19](https://react.dev)
- **Linguagem:** [TypeScript 5](https://www.typescriptlang.org)
- **Estilo:** [Tailwind CSS 4](https://tailwindcss.com) (dark mode por classe, sem FOUC)
- **ORM/DB:** [Prisma 7](https://www.prisma.io) (client Rust-free + driver adapter `@prisma/adapter-pg`) sobre [PostgreSQL](https://www.postgresql.org)
- **IA:** [Claude](https://www.anthropic.com) via `@anthropic-ai/sdk` (structured outputs + streaming)
- **Charts:** [Recharts](https://recharts.org) · **Markdown:** react-markdown + remark-gfm
- **Gerenciador:** [pnpm](https://pnpm.io)

## 🚀 Rodando localmente

**Pré-requisitos:** Node 20+, [pnpm](https://pnpm.io), Docker (para o Postgres local).

```bash
# 1. Instalar dependências (o postinstall roda `prisma generate`)
pnpm install

# 2. Configurar o ambiente
cp .env.example .env      # e preencha ANTHROPIC_API_KEY

# 3. Subir o Postgres (Docker, host:5433) e migrar
pnpm db:up
pnpm db:migrate

# 4. Importar relatórios (opcional) e rodar
pnpm run import           # lê os .md de REPORTS_DIR — NÃO use `pnpm import`
pnpm dev                  # http://localhost:3000
```

> **Prisma 7 — atenção:** o client é gerado em `src/generated/prisma` (gitignored) e
> importado de `@/generated/prisma/client`; a URL de conexão do CLI vive em
> `prisma.config.ts`, não no `schema.prisma`. Após um `migrate` que adiciona modelo,
> **reinicie o dev server** (o singleton do client fica preso via HMR).

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão do Postgres (local: docker; produção: endpoint **pooled** do Neon). |
| `ANTHROPIC_API_KEY` | Chave da API do Claude — usada no dedup, síntese, Canvas/PRD/SDD e aplicabilidade. |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Gate de HTTP Basic auth (`src/proxy.ts`). Defina **ambos** em produção; vazio = sem gate (dev). |
| `REPORTS_DIR` | Pasta dos `.md` do Daily Tech Scout — usada só pelo script de import local. |

## ☁️ Deploy

Roda em **Vercel + Neon** (Postgres serverless), protegido por HTTP Basic auth. O passo a
passo completo (Neon, migrações, variáveis na Vercel) está em **[DEPLOY.md](./DEPLOY.md)**.
Um `Dockerfile` multi-stage (Next standalone) também acompanha o projeto como alternativa
de container.

## 🗂️ Estrutura

```
src/
├─ app/                    # App Router (páginas + Server Actions por feature)
│  ├─ ranking/  radar/  roadmap/  duplicates/  sintese/  projetos/
│  ├─ ideas/[id]/          # detalhe + canvas · prd · sdd
│  ├─ conquistas/  configuracoes/  importar/
│  └─ api/                 # import (cron) + download de artefatos
├─ lib/                    # regras: parser, scoring, ranking, dedup, synthesis,
│                          #         generate (IA), projects, gamification, trends
├─ generated/prisma/       # client do Prisma 7 (gitignored)
└─ proxy.ts                # HTTP Basic auth (Next 16: middleware → proxy)
prisma/                    # schema + migrations
scripts/import.ts          # importador CLI
```

## 🗺️ Status

Todos os módulos planejados foram entregues e o projeto está **em produção**. Próximas
frentes possíveis: automação do import diário (Vercel Cron) e geração de candidatos de
dedup por _embeddings_/pgvector quando o catálogo ativo crescer o suficiente.

## 📄 Licença

Projeto pessoal. Todos os direitos reservados — sinta-se à vontade para se inspirar. 🙂

<div align="center"><sub>Feito com ☕ e Next.js · dados priorizados com Claude</sub></div>
