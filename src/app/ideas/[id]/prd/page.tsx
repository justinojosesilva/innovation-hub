import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prisma } from "@/lib/db";
import { getDoc } from "@/lib/generate";
import { modelLabel } from "@/lib/settings";
import { generatePrdAction } from "../actions";
import { SubmitButton } from "@/app/_components/submit-button";

export const dynamic = "force-dynamic";

export default async function PrdPage({
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

  const doc = await getDoc(id, "PRD");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/ideas/${id}`}
        className="text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← {idea.title}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PRD</h1>
          {doc && (
            <p className="text-xs text-neutral-400">via {modelLabel(doc.model)}</p>
          )}
        </div>
        {doc && (
          <div className="flex items-center gap-3">
            <a
              href={`/api/ideas/${id}/prd`}
              download
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Download className="h-3.5 w-3.5" /> .md
            </a>
            <form action={generatePrdAction}>
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

      {!doc ? (
        <Empty ideaId={id} />
      ) : (
        <article className="space-y-4 text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: (props) => (
                <h2
                  className="mt-8 border-b border-neutral-200 pb-1 text-lg font-semibold tracking-tight dark:border-neutral-800"
                  {...props}
                />
              ),
              h3: (props) => (
                <h3 className="mt-5 font-semibold text-neutral-800 dark:text-neutral-200" {...props} />
              ),
              p: (props) => <p className="text-neutral-600 dark:text-neutral-400" {...props} />,
              ul: (props) => <ul className="ml-5 list-disc space-y-1 text-neutral-600 dark:text-neutral-400" {...props} />,
              ol: (props) => <ol className="ml-5 list-decimal space-y-1 text-neutral-600 dark:text-neutral-400" {...props} />,
              li: (props) => <li className="pl-1" {...props} />,
              strong: (props) => <strong className="font-semibold text-neutral-800 dark:text-neutral-200" {...props} />,
              table: (props) => (
                <div className="overflow-x-auto">
                  <table className="my-2 w-full border-collapse text-left" {...props} />
                </div>
              ),
              th: (props) => <th className="border-b border-neutral-300 px-2 py-1 font-medium dark:border-neutral-700" {...props} />,
              td: (props) => <td className="border-b border-neutral-100 px-2 py-1 dark:border-neutral-800" {...props} />,
              code: (props) => <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800" {...props} />,
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </article>
      )}
    </main>
  );
}

function Empty({ ideaId }: { ideaId: string }) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
      <p className="text-neutral-500">PRD ainda não gerado.</p>
      <form action={generatePrdAction} className="mt-4">
        <input type="hidden" name="ideaId" value={ideaId} />
        <SubmitButton
          disabled={!hasKey}
          pendingText="Gerando PRD…"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Gerar PRD
        </SubmitButton>
      </form>
    </div>
  );
}
