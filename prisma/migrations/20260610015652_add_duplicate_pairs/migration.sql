-- CreateTable
CREATE TABLE "DuplicatePair" (
    "id" TEXT NOT NULL,
    "ideaAId" TEXT NOT NULL,
    "ideaBId" TEXT NOT NULL,
    "similarity" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicatePair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuplicatePair_status_idx" ON "DuplicatePair"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicatePair_ideaAId_ideaBId_key" ON "DuplicatePair"("ideaAId", "ideaBId");

-- AddForeignKey
ALTER TABLE "DuplicatePair" ADD CONSTRAINT "DuplicatePair_ideaAId_fkey" FOREIGN KEY ("ideaAId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicatePair" ADD CONSTRAINT "DuplicatePair_ideaBId_fkey" FOREIGN KEY ("ideaBId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
