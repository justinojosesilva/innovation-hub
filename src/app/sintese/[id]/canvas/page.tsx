import Link from "next/link";
import { notFound } from "next/navigation";
import { getCluster } from "@/lib/synthesis";
import { getClusterDoc, type CanvasBlocks } from "@/lib/generate";
import { modelLabel } from "@/lib/settings";
import { generateClusterCanvasAction } from "../../actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { CanvasGrid } from "@/app/_components/canvas-grid";

export const dynamic = "force-dynamic";
const hasKey = !!process.env.ANTHROPIC_API_KEY;

export default async function ClusterCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await getCluster(id);
  if (!cluster) notFound();

  const doc = await getClusterDoc(id, "CANVAS");
  const blocks = doc ? (JSON.parse(doc.content) as CanvasBlocks) : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/sintese/${id}`}
        className="text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← {cluster.synthName ?? cluster.theme}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Model Canvas</h1>
          {doc && <p className="text-xs text-neutral-400">via {modelLabel(doc.model)}</p>}
        </div>
        {blocks && (
          <form action={generateClusterCanvasAction}>
            <input type="hidden" name="clusterId" value={id} />
            <SubmitButton
              pendingText="Gerando…"
              className="rounded-md px-3 py-1.5 text-sm text-neutral-500 underline-offset-4 hover:underline"
            >
              Regenerar
            </SubmitButton>
          </form>
        )}
      </div>

      {!blocks ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-500">Canvas ainda não gerado.</p>
          <form action={generateClusterCanvasAction} className="mt-4">
            <input type="hidden" name="clusterId" value={id} />
            <SubmitButton
              disabled={!hasKey}
              pendingText="Gerando Canvas…"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Gerar Canvas
            </SubmitButton>
          </form>
        </div>
      ) : (
        <CanvasGrid blocks={blocks} />
      )}
    </main>
  );
}
