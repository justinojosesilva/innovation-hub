-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "maturityChecks" TEXT[] DEFAULT ARRAY[]::TEXT[];
