import type { Profile } from "@/lib/gamification";

export function LevelCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
            {profile.level}
          </span>
          <div>
            <div className="text-sm font-semibold">Nível {profile.level}</div>
            <div className="text-xs text-neutral-400">
              {profile.totalXp.toLocaleString("pt-BR")} XP total
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-neutral-400">
          {profile.xpForNextLevel > 0 ? (
            <>
              faltam{" "}
              <span className="font-medium text-neutral-600 dark:text-neutral-300">
                {(profile.xpForNextLevel - profile.xpIntoLevel).toLocaleString("pt-BR")} XP
              </span>{" "}
              pro nível {profile.level + 1}
            </>
          ) : (
            "nível máximo"
          )}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${Math.round(profile.progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
