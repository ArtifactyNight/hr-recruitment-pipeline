import { createAILogger, createEvlogIntegration } from "evlog/ai";
import { useLogger as evlogRequestLogger } from "evlog/elysia";

import type { TelemetrySettings } from "ai";

/**
 * USD per 1M tokens. Keys match post-resolve model IDs (see evlog `recordModel` /
 * `resolveProviderAndModel`), e.g. `gemini-2.5-flash` for `@ai-sdk/google`.
 * Adjust against current Gemini pricing.
 */
const geminiCostMap: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-2.5-pro-latest": { input: 1.25, output: 10 },
};

/**
 * Request-scoped AI observability for Elysia routes (`evlog()` must run first).
 * Returns null outside an active request (e.g. scripts) so callers can skip telemetry.
 */
export function tryCreateRequestAILogger() {
  try {
    return createAILogger(evlogRequestLogger(), { cost: geminiCostMap });
  } catch {
    return null;
  }
}

export function evlogTelemetryForAi(
  ai: NonNullable<ReturnType<typeof tryCreateRequestAILogger>>,
): TelemetrySettings {
  return {
    isEnabled: true,
    integrations: [createEvlogIntegration(ai)],
  };
}
