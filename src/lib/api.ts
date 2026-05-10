import { treaty } from "@elysiajs/eden";

import type { App } from "@/server";

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const api = treaty<App>(getBaseUrl());
