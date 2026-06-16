-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "ideaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XpEvent_type_idx" ON "XpEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_ideaId_type_key" ON "XpEvent"("ideaId", "type");

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
