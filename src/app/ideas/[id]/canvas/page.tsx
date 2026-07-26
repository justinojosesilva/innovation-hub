import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDoc, type CanvasBlocks } from "@/lib/generate";
import { modelLabel } from "@/lib/settings";
import { generateCanvasAction } from "../actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { CanvasGrid } from "@/app/_components/canvas-grid";

export const dynamic = "force-dynamic";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!idea) notFound();

  const doc = await getDoc(id, "CANVAS");
  const blocks = doc ? (JSON.parse(doc.content) as CanvasBlocks) : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/ideas/${id}`}
        className="text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← {idea.title}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Model Canvas</h1>
          {doc && blocks && (
            <p className="text-xs text-neutral-400">via {modelLabel(doc.model)}</p>
          )}
        </div>
        {blocks && (
          <div className="flex items-center gap-3">
            <a
              href={`/api/ideas/${id}/canvas`}
              download
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Download className="h-3.5 w-3.5" /> .md
            </a>
            <form action={generateCanvasAction}>
              <input type="hidden" name="ideaId" value={id} />
              <SubmitButton
                pendingText="Gerando…"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-500 underline-offset-4 hover:underline"
              >
                Regenerar
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      {!blocks ? <Empty ideaId={id} /> : <CanvasGrid blocks={blocks} />}
    </main>
  );
}

function Empty({ ideaId }: { ideaId: string }) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
      <p className="text-neutral-500">Canvas ainda não gerado.</p>
      <form action={generateCanvasAction} className="mt-4">
        <input type="hidden" name="ideaId" value={ideaId} />
        <SubmitButton
          disabled={!hasKey}
          pendingText="Gerando Canvas…"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Gerar Canvas
        </SubmitButton>
      </form>
    </div>
  );
}
