"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Weights } from "@/lib/scoring";

const WEIGHT_FIELDS: { key: keyof Weights; param: string; label: string }[] = [
  { key: "monetizacao", param: "wMon", label: "Monetização" },
  { key: "implementacao", param: "wImp", label: "Implementação" },
  { key: "stackFit", param: "wStk", label: "Stack Fit" },
  { key: "tendencia", param: "wTen", label: "Tendência" },
  { key: "diferencial", param: "wDif", label: "Diferencial" },
];

export function RankingControls({
  weights,
  categories,
  dates,
  category,
  status,
  reaction,
  date,
}: {
  weights: Weights;
  categories: string[];
  dates: { value: string; label: string }[];
  category?: string;
  status?: string;
  reaction?: string;
  date?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => router.replace(`/ranking?${next.toString()}`));
    },
    [params, router]
  );

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Dia do relatório</span>
          <select
            value={date ?? ""}
            onChange={(e) => update({ date: e.target.value || null })}
            className="min-w-40 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 dark:border-neutral-700"
          >
            <option value="">Todos os dias</option>
            {dates.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Categoria</span>
          <select
            value={category ?? ""}
            onChange={(e) => update({ category: e.target.value || null })}
            className="min-w-44 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 dark:border-neutral-700"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Status</span>
          <select
            value={status ?? ""}
            onChange={(e) => update({ status: e.target.value || null })}
            className="min-w-44 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 dark:border-neutral-700"
          >
            <option value="">Todos</option>
            {["NOVA", "EM_AVALIACAO", "EM_VALIDACAO", "MVP", "PRODUCAO", "DESCARTADA"].map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </option>
              )
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Reação</span>
          <select
            value={reaction ?? ""}
            onChange={(e) => update({ reaction: e.target.value || null })}
            className="min-w-36 rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 dark:border-neutral-700"
          >
            <option value="">Todas</option>
            <option value="LIKED">👍 gostei</option>
            <option value="DISLIKED">👎 não gostei</option>
          </select>
        </label>

        {(category || status || reaction || date) && (
          <button
            onClick={() =>
              update({ category: null, status: null, reaction: null, date: null })
            }
            className="rounded-md px-3 py-1.5 text-sm text-neutral-500 underline-offset-4 hover:underline"
          >
            limpar filtros
          </button>
        )}
        {pending && <span className="text-xs text-neutral-400">atualizando…</span>}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Pesos da fórmula
          </span>
          <button
            onClick={() =>
              update(Object.fromEntries(WEIGHT_FIELDS.map((f) => [f.param, null])))
            }
            className="text-xs text-neutral-500 underline-offset-4 hover:underline"
          >
            restaurar padrão
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {WEIGHT_FIELDS.map((f) => {
            const pct = Math.round(weights[f.key] * 100);
            return (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  {f.label}
                  <span className="tabular-nums text-neutral-400">{pct}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) =>
                    update({ [f.param]: (Number(e.target.value) / 100).toString() })
                  }
                  className="accent-indigo-500"
                />
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Os pesos são renormalizados automaticamente. Ranking recalcula ao vivo.
        </p>
      </div>
    </div>
  );
}
