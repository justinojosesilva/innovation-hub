-- GeneratedDoc can now belong to an Idea OR an IdeaCluster (Sínteses artifacts).
ALTER TABLE "GeneratedDoc" ALTER COLUMN "ideaId" DROP NOT NULL;
ALTER TABLE "GeneratedDoc" ADD COLUMN "clusterId" TEXT;

CREATE UNIQUE INDEX "GeneratedDoc_clusterId_type_key" ON "GeneratedDoc"("clusterId", "type");

ALTER TABLE "GeneratedDoc" ADD CONSTRAINT "GeneratedDoc_clusterId_fkey"
  FOREIGN KEY ("clusterId") REFERENCES "IdeaCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
