import { prisma } from "@/lib/db";

export const PROJECT_STATUSES = [
  "DISCOVERY",
  "BUILDING",
  "LIVE",
  "PAUSED",
  "ARCHIVED",
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  DISCOVERY: "Discovery",
  BUILDING: "Em construção",
  LIVE: "No ar",
  PAUSED: "Pausado",
  ARCHIVED: "Arquivado",
};

export const FEATURE_STATUSES = ["BACKLOG", "DOING", "DONE"] as const;
export type FeatureStatusValue = (typeof FEATURE_STATUSES)[number];
export const FEATURE_STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog",
  DOING: "Fazendo",
  DONE: "Feito",
};

export type Health = "ON_TRACK" | "AT_RISK" | "STALLED" | null;
export const HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: "No caminho",
  AT_RISK: "Em risco",
  STALLED: "Parado",
};
export const HEALTH_DOT: Record<string, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  STALLED: "bg-rose-500",
};

const DAY = 86_400_000;

/** Health derived from time since last activity (paused/archived = neutral). */
export function projectHealth(status: string, lastActivity: Date): Health {
  if (status === "PAUSED" || status === "ARCHIVED") return null;
  const days = (Date.now() - lastActivity.getTime()) / DAY;
  return days <= 7 ? "ON_TRACK" : days <= 21 ? "AT_RISK" : "STALLED";
}

export type PortfolioItem = {
  id: string;
  name: string;
  status: string;
  health: Health;
  featureTotal: number;
  featureDone: number;
  progress: number;
  lastUpdateAt: Date;
  lastUpdateBody: string | null;
  fitCount: number;
  nextMilestone: { title: string; dueDate: Date | null } | null;
};

const HEALTH_RANK: Record<string, number> = { STALLED: 0, AT_RISK: 1, ON_TRACK: 2 };

export async function getPortfolio(): Promise<PortfolioItem[]> {
  const projects = await prisma.project.findMany({
    include: {
      features: { select: { status: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
      milestones: {
        where: { done: false },
        orderBy: { dueDate: { sort: "asc", nulls: "last" } },
        take: 1,
        select: { title: true, dueDate: true },
      },
      _count: { select: { fits: true } },
    },
  });

  const items = projects.map((p) => {
    const featureTotal = p.features.length;
    const featureDone = p.features.filter((f) => f.status === "DONE").length;
    const lastUpdate = p.updates[0];
    const lastUpdateAt = lastUpdate?.createdAt ?? p.createdAt;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      health: projectHealth(p.status, lastUpdateAt),
      featureTotal,
      featureDone,
      progress: featureTotal > 0 ? featureDone / featureTotal : 0,
      lastUpdateAt,
      lastUpdateBody: lastUpdate?.body ?? null,
      fitCount: p._count.fits,
      nextMilestone: p.milestones[0] ?? null,
    };
  });

  // Active first, most-neglected on top; paused/archived last.
  return items.sort((a, b) => {
    const aArchived = a.status === "ARCHIVED" || a.status === "PAUSED";
    const bArchived = b.status === "ARCHIVED" || b.status === "PAUSED";
    if (aArchived !== bArchived) return aArchived ? 1 : -1;
    const ah = a.health ? HEALTH_RANK[a.health] : 3;
    const bh = b.health ? HEALTH_RANK[b.health] : 3;
    return ah - bh || a.name.localeCompare(b.name);
  });
}

export async function getProjectWorkspace(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      features: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] },
      updates: { orderBy: { createdAt: "desc" } },
      metrics: { include: { points: { orderBy: { date: "asc" } } }, orderBy: { createdAt: "asc" } },
      milestones: { orderBy: { dueDate: { sort: "asc", nulls: "last" } } },
    },
  });
  if (!project) return null;

  const featuresByStatus = {
    BACKLOG: project.features.filter((f) => f.status === "BACKLOG"),
    DOING: project.features.filter((f) => f.status === "DOING"),
    DONE: project.features.filter((f) => f.status === "DONE"),
  };
  const total = project.features.length;
  const done = featuresByStatus.DONE.length;
  const lastUpdateAt = project.updates[0]?.createdAt ?? project.createdAt;

  return {
    project,
    featuresByStatus,
    progress: total > 0 ? done / total : 0,
    total,
    done,
    health: projectHealth(project.status, lastUpdateAt),
  };
}
