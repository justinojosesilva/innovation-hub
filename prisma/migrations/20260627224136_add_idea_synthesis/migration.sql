-- AlterTable
ALTER TABLE "Idea" ALTER COLUMN "reportId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IdeaCluster" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "synthName" TEXT,
    "synthValueProp" TEXT,
    "synthDifferential" TEXT,
    "synthMvp" TEXT,
    "synthFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "synthScores" JSONB,
    "synthesizedAt" TIMESTAMP(3),
    "savedIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClusterIdeas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClusterIdeas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ClusterIdeas_B_index" ON "_ClusterIdeas"("B");

-- AddForeignKey
ALTER TABLE "_ClusterIdeas" ADD CONSTRAINT "_ClusterIdeas_A_fkey" FOREIGN KEY ("A") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterIdeas" ADD CONSTRAINT "_ClusterIdeas_B_fkey" FOREIGN KEY ("B") REFERENCES "IdeaCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
