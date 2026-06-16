-- CreateEnum
CREATE TYPE "Reaction" AS ENUM ('LIKED', 'DISLIKED');

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "reaction" "Reaction";
