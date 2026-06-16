-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFit" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "roi" TEXT NOT NULL,
    "effortWeeks" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFit_projectId_idx" ON "ProjectFit"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFit_ideaId_projectId_key" ON "ProjectFit"("ideaId", "projectId");

-- AddForeignKey
ALTER TABLE "ProjectFit" ADD CONSTRAINT "ProjectFit_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFit" ADD CONSTRAINT "ProjectFit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
