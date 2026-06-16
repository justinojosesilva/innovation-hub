import {
  LayoutDashboard,
  Trophy,
  Radar,
  KanbanSquare,
  GitMerge,
  Award,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Priorização",
    items: [
      { href: "/ranking", label: "Ranking", icon: Trophy },
      { href: "/radar", label: "Radar", icon: Radar },
      { href: "/roadmap", label: "Roadmap", icon: KanbanSquare },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/duplicates", label: "Duplicatas", icon: GitMerge },
      { href: "/conquistas", label: "Conquistas", icon: Award },
    ],
  },
  {
    label: "Projetos",
    items: [{ href: "/projetos", label: "Projetos", icon: Briefcase }],
  },
];

/** Active when the path equals the item (exact for "/") or is nested under it. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
