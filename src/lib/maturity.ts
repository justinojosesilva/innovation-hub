// Module: per-stage maturation gates. Each funnel stage has a checklist of
// criteria the idea should meet before it's "mature" enough to advance.
export type MaturityItem = { key: string; label: string };

export const MATURITY_CHECKLISTS: Record<string, MaturityItem[]> = {
  NOVA: [
    { key: "nova:triada", label: "Triada (gostei / não gostei)" },
    { key: "nova:vale", label: "Vale uma avaliação mais a fundo" },
  ],
  EM_AVALIACAO: [
    { key: "aval:problema", label: "Problema bem definido" },
    { key: "aval:mercado", label: "Demanda / mercado estimados" },
    { key: "aval:concorrentes", label: "Concorrentes mapeados" },
    { key: "aval:fit", label: "Fit com sua stack / skills" },
  ],
  EM_VALIDACAO: [
    { key: "valid:proto", label: "Protótipo ou mock" },
    { key: "valid:feedback", label: "Feedback de usuário real" },
    { key: "valid:valor", label: "Proposta de valor validada" },
    { key: "valid:receita", label: "Modelo de receita testado" },
  ],
  MVP: [
    { key: "mvp:escopo", label: "Escopo do MVP definido" },
    { key: "mvp:prd", label: "PRD gerado" },
    { key: "mvp:roadmap", label: "Roadmap inicial" },
    { key: "mvp:metricas", label: "Métricas de sucesso definidas" },
  ],
  PRODUCAO: [
    { key: "prod:lancado", label: "Lançado" },
    { key: "prod:usuarios", label: "Primeiros usuários" },
    { key: "prod:tracao", label: "Tração / receita inicial" },
  ],
  DESCARTADA: [],
};

export function stageMaturity(status: string, checks: string[]) {
  const items = MATURITY_CHECKLISTS[status] ?? [];
  const done = items.filter((i) => checks.includes(i.key)).length;
  return {
    items,
    done,
    total: items.length,
    pct: items.length > 0 ? done / items.length : 1,
    complete: items.length === 0 || done === items.length,
  };
}
