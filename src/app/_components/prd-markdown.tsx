import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Shared markdown renderer for generated PRD/SDD documents.
export function PrdMarkdown({ content }: { content: string }) {
  return (
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
        {content}
      </ReactMarkdown>
    </article>
  );
}
