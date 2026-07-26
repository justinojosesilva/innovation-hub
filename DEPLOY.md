# Deploy — Vercel + Neon

O Innovation Hub sobe como um app **Next.js na Vercel** com **Neon** (Postgres
serverless), mesmo padrão do Study OS. Não usa `pgvector` (o dedup é via Claude),
então um Postgres comum do Neon basta — sem extensões.

Diferente do Study OS, aqui **não há login OAuth**. A app é protegida por **HTTP
Basic auth** (`src/proxy.ts`), configurado por variáveis de ambiente. Sem elas, a
app fica aberta — então **defina-as em produção** (senão qualquer um lê/edita as
ideias e dispara chamadas pagas ao Claude).

---

## 0. Pré-requisitos

- Conta [Neon](https://neon.tech) (free tier basta).
- Conta [Vercel](https://vercel.com) com este repo no **GitHub**.
- Sua `ANTHROPIC_API_KEY`.

---

## 1. Neon — criar o banco

1. Crie um projeto no Neon, na **mesma região da Vercel** (latência function↔banco).
2. Pegue as **duas** formas da connection string:
   - **Direta** (host sem `-pooler`) — usada nas **migrações**.
   - **Pooled** (host com `-pooler`, PgBouncer) — usada pelo **app em runtime**.

Ambas terminam com `?sslmode=require`.

---

## 2. Migrações (rode uma vez, da sua máquina)

Aponte para a URL **direta** do Neon e aplique as migrações versionadas:

```bash
export DATABASE_URL="postgresql://<owner>:<senha>@<host>.neon.tech/<db>?sslmode=require"
pnpm exec prisma migrate deploy
```

`migrate deploy` aplica as migrações de `prisma/migrations/` em ordem, sem gerar
novas nem pedir confirmação (ao contrário de `migrate dev`). Não há seed em
produção.

---

## 3. Vercel — importar + variáveis de ambiente

Importe o repo do GitHub na Vercel (o framework Next.js é detectado automaticamente;
o `postinstall` roda `prisma generate` e regenera o client em `src/generated`).

Defina estas variáveis de ambiente **antes do primeiro deploy** (o `prisma generate`
do `postinstall` lê `DATABASE_URL` e falha se ela faltar):

| Variável              | Valor                                                        |
| --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | connection string **POOLED** do Neon (`-pooler`, sslmode)    |
| `ANTHROPIC_API_KEY`   | sua chave da API do Claude                                   |
| `BASIC_AUTH_USER`     | usuário do gate (escolha um)                                 |
| `BASIC_AUTH_PASSWORD` | senha forte do gate                                          |

Observações:

- Ajuste a **região da function para casar com a região do Neon**.
- O runtime conecta via `@prisma/adapter-pg` (node-postgres) contra o endpoint
  **pooled** — ver `src/lib/db.ts`.
- `REPORTS_DIR` **não** é necessário: o import por arquivo (`scripts/import.ts`)
  é local; na web use a tela **/importar** (upload).
- `output: "standalone"` no `next.config.ts` é para o Dockerfile; a Vercel ignora
  com segurança.

Faça o deploy. O navegador vai pedir usuário/senha (o Basic auth) no primeiro acesso.

---

## 4. Checklist pós-deploy

- [ ] O prompt de Basic auth aparece e as credenciais entram.
- [ ] Dashboard, /ranking, /radar, /roadmap, /projetos e /sintese carregam.
- [ ] Importar um `.md` em **/importar** cria ideias (persiste no Neon).
- [ ] Uma ação de IA (ex.: sintetizar um grupo em /sintese) roda e salva.
- [ ] Sem `BASIC_AUTH_*`? Confirme que você QUER isso — a app fica pública.

---

## 5. Automação do Daily Tech Scout (follow-up)

O import diário das 08:00 lê arquivos `.md` do disco (`REPORTS_DIR`), o que não
existe na Vercel. Opções: rodar `pnpm run import` numa máquina/cron seu apontando
`DATABASE_URL` pro Neon, ou postar o conteúdo no endpoint `POST /api/import`
(protegido pelo mesmo Basic auth) via Vercel Cron/GitHub Action.

---

## Alternativa: container (Docker)

O `Dockerfile` multi-stage (standalone) e o `docker-compose.yml` (perfil `app`)
estão prontos, caso queira rodar num host de container em vez da Vercel:

```bash
docker compose --profile app up --build
```
