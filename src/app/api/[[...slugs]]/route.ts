import { elysiaApp } from "@/server/elysia-app";

function handler(request: Request) {
  return elysiaApp.fetch(request);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
