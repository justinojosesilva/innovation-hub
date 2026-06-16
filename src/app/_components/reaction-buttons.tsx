"use client";

import { useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { setReaction } from "@/app/reaction-actions";

export function ReactionButtons({
  ideaId,
  reaction,
}: {
  ideaId: string;
  reaction: "LIKED" | "DISLIKED" | null;
}) {
  const [pending, start] = useTransition();
  const toggle = (r: "LIKED" | "DISLIKED") =>
    start(() => setReaction(ideaId, reaction === r ? null : r));

  const liked = reaction === "LIKED";
  const disliked = reaction === "DISLIKED";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggle("LIKED")}
        disabled={pending}
        aria-label="Gostei"
        aria-pressed={liked}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
          liked
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "border-neutral-300 text-neutral-400 hover:border-emerald-300 hover:text-emerald-500 dark:border-neutral-700"
        }`}
      >
        <ThumbsUp className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        onClick={() => toggle("DISLIKED")}
        disabled={pending}
        aria-label="Não gostei"
        aria-pressed={disliked}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
          disliked
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
            : "border-neutral-300 text-neutral-400 hover:border-rose-300 hover:text-rose-500 dark:border-neutral-700"
        }`}
      >
        <ThumbsDown className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
