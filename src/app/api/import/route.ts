import { NextResponse } from "next/server";
import { importDir, ensureWeights } from "@/lib/import";

// POST /api/import — imports every new .md in REPORTS_DIR. Idempotent.
// Wire your 08:00 cron to this (or run `pnpm import` directly).
export async function POST() {
  await ensureWeights();
  const dir = process.env.REPORTS_DIR ?? "./reports";
  const results = await importDir(dir);
  const imported = results.filter((r) => r.status === "imported");
  return NextResponse.json({
    dir,
    imported: imported.length,
    skipped: results.length - imported.length,
    results,
  });
}
