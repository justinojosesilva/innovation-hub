import Link from "next/link";
import { getProfile, getAchievements, XP_CREATED, STATUS_XP } from "@/lib/gamification";
import { LevelCard } from "@/app/_components/level-card";

export const dynamic = "force-dynamic";

export default async function ConquistasPage() {
  const [profile, achievements] = await Promise.all([getProfile(), getAchievements()]);
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conquistas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {earned} de {achievements.length} desbloqueadas.
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
          ← início
        </Link>
      </header>

      <LevelCard profile={profile} />

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {achievements.map((a) => (
          <div
            key={a.slug}
            className={`rounded-xl border p-4 transition-colors ${
              a.earned
                ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`text-2xl ${a.earned ? "" : "opacity-30 grayscale"}`}>
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  {a.earned && (
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">{a.description}</p>
                {!a.earned && a.target > 1 && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-indigo-400"
                        style={{ width: `${(a.current / a.target) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-xs tabular-nums text-neutral-400">
                      {a.current}/{a.target}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 p-5 text-sm dark:border-neutral-800">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Como ganhar XP
        </h2>
        <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
          <li className="flex justify-between">
            <span>Catalogar uma ideia</span>
            <span className="tabular-nums text-neutral-400">+{XP_CREATED} XP</span>
          </li>
          <li className="flex justify-between">
            <span>Validar uma ideia</span>
            <span className="tabular-nums text-neutral-400">+{STATUS_XP.EM_VALIDACAO.xp} XP</span>
          </li>
          <li className="flex justify-between">
            <span>Levar até MVP</span>
            <span className="tabular-nums text-neutral-400">+{STATUS_XP.MVP.xp} XP</span>
          </li>
          <li className="flex justify-between">
            <span>Colocar em produção</span>
            <span className="tabular-nums text-neutral-400">+{STATUS_XP.PRODUCAO.xp} XP</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-neutral-400">
          Cada marco é pontuado uma vez por ideia.
        </p>
      </section>
    </main>
  );
}
