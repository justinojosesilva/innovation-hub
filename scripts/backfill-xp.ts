// One-time idempotent backfill of XP for ideas imported before gamification.
import "dotenv/config";
import { backfillXp, getProfile } from "@/lib/gamification";
import { prisma } from "@/lib/db";

backfillXp()
  .then(async (n) => {
    const p = await getProfile();
    console.log(`Backfilled ${n} ideas. Nível ${p.level}, ${p.totalXp} XP total.`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
