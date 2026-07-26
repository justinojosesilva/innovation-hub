import Link from "next/link";
import { notFound } from "next/navigation";
import { getCluster } from "@/lib/synthesis";
import { getClusterDoc } from "@/lib/generate";
import { modelLabel } from "@/lib/settings";
import { generateClusterPrdAction } from "../../actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { PrdMarkdown } from "@/app/_components/prd-markdown";

export const dynamic = "force-dynamic";
const hasKey = !!process.env.ANTHROPIC_API_KEY;

export default async function ClusterPrdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cluster = await getCluster(id);
  if (!cluster) notFound();

  const doc = await getClusterDoc(id, "PRD");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/sintese/${id}`}
        className="text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← {cluster.synthName ?? cluster.theme}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PRD</h1>
          {doc && <p className="text-xs text-neutral-400">via {modelLabel(doc.model)}</p>}
        </div>
        {doc && (
          <form action={generateClusterPrdAction}>
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

      {!doc ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <p className="text-neutral-500">PRD ainda não gerado.</p>
          <form action={generateClusterPrdAction} className="mt-4">
            <input type="hidden" name="clusterId" value={id} />
            <SubmitButton
              disabled={!hasKey}
              pendingText="Gerando PRD…"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Gerar PRD
            </SubmitButton>
          </form>
        </div>
      ) : (
        <PrdMarkdown content={doc.content} />
      )}
    </main>
  );
}
