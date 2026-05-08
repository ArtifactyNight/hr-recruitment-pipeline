"use client";

import { Progress } from "@/components/ui/progress";

type FitRowProps = {
  title: string;
  score: number;
  text: string;
};

export function FitRow({ title, score, text }: FitRowProps) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const body = text.trim();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="text-black font-bold text-lg">
            {safeScore.toFixed(1)}
          </span>{" "}
          / 10
        </span>
      </div>
      <Progress value={Math.min(100, Math.max(0, safeScore * 10))} />
      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {body || "ไม่มีคำอธิบายในผลลัพธ์"}
      </p>
    </div>
  );
}
