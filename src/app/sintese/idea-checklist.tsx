"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";

type PickIdea = { id: string; title: string; category: string | null };

// Reusable searchable checkbox list. Checked boxes submit under name="ideaIds".
export function IdeaCheckList({
  ideas,
  emptyText = "Nenhuma ideia disponível.",
}: {
  ideas: PickIdea[];
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const groupId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.category ?? "").toLowerCase().includes(q)
    );
  }, [ideas, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (ideas.length === 0) {
    return <p className="py-2 text-sm text-neutral-400">{emptyText}</p>;
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar ideias…"
          className="w-full rounded-lg border border-neutral-200 bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-neutral-400">Nada encontrado.</p>
        ) : (
          filtered.map((i) => (
            <label
              key={i.id}
              htmlFor={`${groupId}-${i.id}`}
              className="flex cursor-pointer items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
            >
              <input
                id={`${groupId}-${i.id}`}
                type="checkbox"
                name="ideaIds"
                value={i.id}
                checked={selected.has(i.id)}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 shrink-0 accent-indigo-600"
              />
              <span className="truncate">{i.title}</span>
              {i.category && (
                <span className="ml-auto shrink-0 text-[10px] text-neutral-400">{i.category}</span>
              )}
            </label>
          ))
        )}
      </div>

      <p className="mt-1.5 text-xs text-neutral-400">{selected.size} selecionada(s)</p>
    </div>
  );
}
