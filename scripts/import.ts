// CLI importer — run by the daily cron after the 08:00 report is generated.
//   pnpm import            -> imports every .md in REPORTS_DIR
//   pnpm import <file.md>  -> imports a single file
import "dotenv/config";
import path from "node:path";
import { importDir, importFile, ensureWeights } from "@/lib/import";
import { prisma } from "@/lib/db";

async function main() {
  await ensureWeights();

  const arg = process.argv[2];
  const results = arg
    ? [await importFile(path.resolve(arg))]
    : await importDir(path.resolve(process.env.REPORTS_DIR ?? "./reports"));

  if (results.length === 0) {
    console.log("No .md reports found. Set REPORTS_DIR or pass a file path.");
    return;
  }

  for (const r of results) {
    const detail =
      r.status === "imported" ? `${r.ideaCount} ideas` : "already imported";
    console.log(`  ${r.status === "imported" ? "✓" : "·"} ${r.file} — ${detail}`);
  }
  const imported = results.filter((r) => r.status === "imported").length;
  console.log(`\nDone: ${imported} new report(s), ${results.length - imported} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
