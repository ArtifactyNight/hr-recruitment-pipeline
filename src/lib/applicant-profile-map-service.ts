import {
  applicantProfileMapSchema,
  type ApplicantProfileMap,
} from "@/features/applicants-tracker/schemas";
import { evlogTelemetryForAi, tryCreateRequestAILogger } from "@/lib/ai-evlog";
import { google } from "@ai-sdk/google";
import { generateText, Output, zodSchema } from "ai";
import { createFallback } from "ai-fallback";

const model = createFallback({
  models: [
    google("gemini-2.0-flash-lite"),
    google("gemini-2.0-flash"),
    google("gemini-2.5-flash-lite"),
    google("gemini-2.5-flash"),
    google("gemini-2.5-pro-latest"),
  ],
});

const PROFILE_MAP_SYSTEM = `You extract structured recruitment data from a candidate profile or CV pasted as plain text (often from LinkedIn, JobsDB, or HR paste).

Rules:
- Copy facts only from the text. Do not invent employers, degrees, emails, or skills.
- If name or email is missing, use an empty string "" for that field.
- Phone: omit or null if not present.
- latestRole: current or most recent job title only; null if unclear.
- skills: concise skill tokens only (languages, frameworks, tools); dedupe; empty array if none found.
- experiences: chronological order most recent first when the source implies order; each needs non-empty company AND role when both appear in source; skip ambiguous fragments.
- educations: institution + degree/field; skip if not stated.
- sourceSuggestion: LINKEDIN if SOURCE_URL hostname suggests LinkedIn; JOBSDB if JobsDB; else null if unclear.

Respond only via the structured schema; use empty strings and empty arrays where unknown.`;

function normalizeMappedProfile(raw: ApplicantProfileMap): ApplicantProfileMap {
  const phoneRaw = raw.phone;
  const phoneTrim =
    phoneRaw === null || phoneRaw === undefined ? undefined : phoneRaw.trim();
  const latestRaw = raw.latestRole;
  const latestTrim =
    latestRaw === null || latestRaw === undefined
      ? undefined
      : latestRaw.trim();

  return {
    name: raw.name.trim(),
    email: raw.email.trim(),
    ...(phoneTrim !== undefined && phoneTrim.length > 0
      ? { phone: phoneTrim }
      : {}),
    ...(latestTrim !== undefined && latestTrim.length > 0
      ? { latestRole: latestTrim }
      : {}),
    skills: Array.from(
      new Set(raw.skills.map((s) => s.trim()).filter((s) => s.length > 0)),
    ),
    experiences: raw.experiences
      .map((e) => ({
        company: e.company.trim(),
        role: e.role.trim(),
        ...(e.description && e.description.trim().length > 0
          ? { description: e.description.trim() }
          : {}),
      }))
      .filter((e) => e.company.length > 0 && e.role.length > 0),
    educations: raw.educations
      .map((ed) => ({
        school: ed.school.trim(),
        degree: ed.degree.trim(),
      }))
      .filter((ed) => ed.school.length > 0 && ed.degree.length > 0),
    ...(raw.sourceSuggestion !== undefined && raw.sourceSuggestion !== null
      ? { sourceSuggestion: raw.sourceSuggestion }
      : {}),
  };
}

type MapProfileTextFromRawInput = {
  profileText: string;
  profileUrl?: string;
};

export async function mapProfileTextFromRaw(
  input: MapProfileTextFromRawInput,
): Promise<ApplicantProfileMap> {
  const trimmed = input.profileText.trim();
  if (!trimmed) {
    throw Object.assign(new Error("ไม่มีข้อความโปรไฟล์"), {
      statusCode: 400,
    });
  }

  const urlHint = input.profileUrl?.trim()
    ? `\nSOURCE_URL: ${input.profileUrl.trim()}`
    : "";

  const aiLogger = tryCreateRequestAILogger();
  const llmModel = aiLogger ? aiLogger.wrap(model) : model;
  const experimentalTelemetry = aiLogger
    ? evlogTelemetryForAi(aiLogger)
    : undefined;

  try {
    const { output } = await generateText({
      model: llmModel,
      system: PROFILE_MAP_SYSTEM,
      output: Output.object({
        schema: zodSchema(applicantProfileMapSchema),
      }),
      ...(experimentalTelemetry
        ? { experimental_telemetry: experimentalTelemetry }
        : {}),
      messages: [
        {
          role: "user",
          content: `PROFILE_TEXT:\n${trimmed}${urlHint}`,
        },
      ],
    });

    if (!output) {
      throw Object.assign(new Error("ไม่ได้รับผลลัพธ์จาก AI"), {
        statusCode: 502,
      });
    }

    const parsed = applicantProfileMapSchema.parse(output);
    return normalizeMappedProfile(parsed);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof (error as { statusCode: unknown }).statusCode === "number"
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    throw Object.assign(new Error("แมปข้อมูลโปรไฟล์ไม่สำเร็จ"), {
      statusCode: 502,
      detail: message,
    });
  }
}
