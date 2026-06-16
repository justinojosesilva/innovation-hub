import { prisma } from "@/lib/db";
import { getDoc, canvasToMarkdown, type CanvasBlocks } from "@/lib/generate";

const TYPES: Record<string, "CANVAS" | "PRD" | "SDD"> = {
  canvas: "CANVAS",
  prd: "PRD",
  sdd: "SDD",
};

// GET /api/ideas/[id]/[type] → downloads the artifact as a .md file.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;
  const docType = TYPES[type.toLowerCase()];
  if (!docType) return new Response("Tipo inválido", { status: 400 });

  const [doc, idea] = await Promise.all([
    getDoc(id, docType),
    prisma.idea.findUnique({ where: { id }, select: { title: true, slug: true } }),
  ]);
  if (!doc || !idea) return new Response("Não encontrado", { status: 404 });

  const md =
    docType === "CANVAS"
      ? canvasToMarkdown(JSON.parse(doc.content) as CanvasBlocks, idea.title)
      : doc.content;

  const filename = `${idea.slug || id}-${type.toLowerCase()}.md`;
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
