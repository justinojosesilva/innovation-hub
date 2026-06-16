"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, Menu, X, Settings } from "lucide-react";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

// Mobile top bar + slide-in drawer (<1024px). >5 destinations → drawer, not bottom nav.
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Innovation Hub</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 motion-safe:animate-[fadeIn_150ms_ease-out]"
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-neutral-200 bg-white px-3 py-5 shadow-xl motion-safe:animate-[slideIn_200ms_ease-out] dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-6 flex items-center justify-between px-3">
              <span className="text-sm font-semibold tracking-tight">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Link
                href="/configuracoes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={2} />
                Configurações
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
