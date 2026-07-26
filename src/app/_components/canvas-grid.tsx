import { CANVAS_LABELS, type CanvasBlocks } from "@/lib/generate";

// Classic Business Model Canvas topology (md+). Scrolls horizontally on mobile.
const AREAS = `"kp ka vp cr cs" "kp kr vp ch cs" "cost cost rev rev rev"`;
const PLACEMENT: Record<keyof CanvasBlocks, string> = {
  keyPartners: "kp",
  keyActivities: "ka",
  keyResources: "kr",
  valuePropositions: "vp",
  customerRelationships: "cr",
  channels: "ch",
  customerSegments: "cs",
  costStructure: "cost",
  revenueStreams: "rev",
};
const ORDER = Object.keys(PLACEMENT) as (keyof CanvasBlocks)[];

export function CanvasGrid({ blocks }: { blocks: CanvasBlocks }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[820px] gap-3"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", gridTemplateAreas: AREAS }}
      >
        {ORDER.map((key) => (
          <Block
            key={key}
            area={PLACEMENT[key]}
            label={CANVAS_LABELS[key]}
            items={blocks[key] ?? []}
            highlight={key === "valuePropositions"}
          />
        ))}
      </div>
    </div>
  );
}

function Block({
  area,
  label,
  items,
  highlight,
}: {
  area: string;
  label: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      style={{ gridArea: area }}
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
            <span className="text-indigo-400">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
