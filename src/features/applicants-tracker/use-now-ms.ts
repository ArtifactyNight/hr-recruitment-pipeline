"use client";

import { useEffect, useState } from "react";

/** Stable clock for relative labels; ticks every `intervalMs` (default 60s). */
export function useNowMs(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
