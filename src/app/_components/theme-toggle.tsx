"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  // Read the class the inline script already applied.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100 ${className ?? ""}`}
    >
      {/* Avoid hydration mismatch: render a neutral icon until mounted. */}
      {dark === null ? (
        <Sun className="h-4 w-4 shrink-0" strokeWidth={2} />
      ) : dark ? (
        <Sun className="h-4 w-4 shrink-0" strokeWidth={2} />
      ) : (
        <Moon className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <span>{dark ? "Tema claro" : "Tema escuro"}</span>
    </button>
  );
}
