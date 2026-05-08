import { createEdenTreatyQueryRootHooks } from "@ap0nia/eden-react-query";

import type { App } from "@/server/elysia-app";

export const eden = createEdenTreatyQueryRootHooks<App>();

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function createAppEdenClient() {
  return eden.createHttpClient({
    baseUrl: getBaseUrl(),
  });
}
