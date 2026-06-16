import Link from "next/link";
import { Lightbulb, Settings } from "lucide-react";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

// Desktop sidebar — fixed, persistent navigation (≥1024px).
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-5 lg:flex dark:border-neutral-800 dark:bg-neutral-950">
      <Link href="/" className="mb-7 flex items-center gap-2 px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Lightbulb className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-sm font-semibold tracking-tight">Innovation Hub</span>
      </Link>
      <NavLinks />
      <div className="mt-auto border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Link
          href="/configuracoes"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={2} />
          Configurações
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
