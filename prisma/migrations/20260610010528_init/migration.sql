-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NOVA', 'EM_AVALIACAO', 'EM_VALIDACAO', 'MVP', 'PRODUCAO', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "Complexity" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "sourceDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "rawMd" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "description" TEXT,
    "whyItMatters" TEXT,
    "howToImplement" TEXT,
    "monetization" TEXT,
    "problem" TEXT,
    "solution" TEXT,
    "audience" TEXT,
    "mvp" TEXT,
    "stack" TEXT,
    "complexity" "Complexity",
    "isTopOpportunity" BOOLEAN NOT NULL DEFAULT false,
    "status" "IdeaStatus" NOT NULL DEFAULT 'NOVA',
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "rawSection" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaScore" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "monetizacao" INTEGER,
    "implementacao" INTEGER,
    "stackFit" INTEGER,
    "tendencia" INTEGER,
    "diferencial" INTEGER,
    "reportScore" DECIMAL(4,2),

    CONSTRAINT "IdeaScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaNote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'observacao',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreWeights" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "monetizacao" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "implementacao" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "stackFit" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "tendencia" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "diferencial" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreWeights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_fileHash_key" ON "Report"("fileHash");

-- CreateIndex
CREATE INDEX "Idea_status_idx" ON "Idea"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Idea_reportId_slug_key" ON "Idea"("reportId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaScore_ideaId_key" ON "IdeaScore"("ideaId");

-- CreateIndex
CREATE INDEX "IdeaNote_ideaId_idx" ON "IdeaNote"("ideaId");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaNote" ADD CONSTRAINT "IdeaNote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
