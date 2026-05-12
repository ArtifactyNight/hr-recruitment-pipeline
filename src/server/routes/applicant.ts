import { computePrimaryInterview } from "@/features/applicants-tracker/applicant-interview-helpers";
import type { ApplicantProfileMap } from "@/features/applicants-tracker/schemas";
import type { TrackerApplicantInterview } from "@/features/applicants-tracker/types";
import { fitReportSchema } from "@/features/screener/schemas";
import {
  type ApplicantSource,
  type ApplicantStage,
  type InterviewStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  mapProfileFromFile,
  mapProfileTextFromRaw,
} from "@/lib/applicant-profile-map-service";
import prisma from "@/lib/prisma";
import {
  extractScrapedMeta,
  extractScrapedTitle,
  stripHtml,
} from "@/lib/profile-url-scrape";
import {
  deleteResumeFromR2,
  getResumePdfBytesFromR2,
  getResumeSignedDownloadUrl,
  isR2Configured,
  putResumePdfToR2,
  resumeObjectKeyForApplicant,
} from "@/lib/r2";
import {
  evaluateResumeAgainstJob,
  fileHasBytes,
  fitReportToScreeningScalars,
} from "@/lib/resume-screening-service";
import { scrape } from "@/lib/scraping";
import { authPlugin } from "@/server/plugins/auth-plugin";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const stageUnion = t.Union([
  t.Literal("APPLIED"),
  t.Literal("SCREENING"),
  t.Literal("PRE_SCREEN_CALL"),
  t.Literal("FIRST_INTERVIEW"),
  t.Literal("OFFER"),
  t.Literal("HIRED"),
  t.Literal("REJECTED"),
]);

const sourceUnion = t.Union([
  t.Literal("LINKEDIN"),
  t.Literal("JOBSDB"),
  t.Literal("REFERRAL"),
  t.Literal("OTHER"),
]);

function strengthsToTags(raw: unknown): Array<string> {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: Array<string> = [];
  for (const x of raw) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t) {
        out.push(t);
      }
    }
  }
  return out.slice(0, 5);
}

function applicantInterviewSubset(
  organizerUserId: string,
): Prisma.InterviewFindManyArgs {
  return {
    where: {
      organizerUserId,
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      status: true,
      googleMeetLink: true,
      googleEventId: true,
      interviewers: {
        select: { id: true, name: true, email: true, title: true },
      },
    },
  };
}

type ApplicantInterviewMapRow = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
  }>;
};

function mapInterviewRow(iv: ApplicantInterviewMapRow): {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: InterviewStatus;
  googleMeetLink: string | null;
  googleEventId: string | null;
  interviewers: Array<{
    id: string;
    name: string;
    email: string;
    title: string | null;
  }>;
} {
  return {
    id: iv.id,
    scheduledAt: iv.scheduledAt.toISOString(),
    durationMinutes: iv.durationMinutes,
    status: iv.status,
    googleMeetLink: iv.googleMeetLink,
    googleEventId: iv.googleEventId,
    interviewers: iv.interviewers.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      title: i.title ?? null,
    })),
  };
}

function mapApplicantInterviewPayload(
  interviews: Array<ApplicantInterviewMapRow>,
): {
  interviews: Array<TrackerApplicantInterview>;
  interview: TrackerApplicantInterview | null;
} {
  const mapped = interviews.map(
    mapInterviewRow,
  ) as Array<TrackerApplicantInterview>;
  const interview = computePrimaryInterview(mapped, Date.now());
  return { interviews: mapped, interview };
}

function applicantListFields(
  sr: {
    overallScore: number;
    skillFit: number;
    experienceFit: number;
    cultureFit: number;
    strengths: unknown;
  } | null,
) {
  if (!sr) {
    return {
      overallScore: null as number | null,
      skillFit: null as number | null,
      experienceFit: null as number | null,
      cultureFit: null as number | null,
      tags: [] as Array<string>,
    };
  }
  return {
    overallScore: sr.overallScore,
    skillFit: sr.skillFit,
    experienceFit: sr.experienceFit,
    cultureFit: sr.cultureFit,
    tags: strengthsToTags(sr.strengths),
  };
}

const applicantSourceSchema = z.enum([
  "LINKEDIN",
  "JOBSDB",
  "REFERRAL",
  "OTHER",
]);

const experienceItemSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const educationItemSchema = z.object({
  school: z.string().trim().min(1),
  degree: z.string().trim().min(1),
});

const submitPayloadSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  jobDescriptionId: z.string().min(1),
  source: applicantSourceSchema.optional(),
  cvText: z.string().optional(),
  latestRole: z.string().trim().optional(),
  skills: z.array(z.string().trim().min(1)).optional().default([]),
  experiences: z.array(experienceItemSchema).optional().default([]),
  educations: z.array(educationItemSchema).optional().default([]),
  report: fitReportSchema.optional(),
});

function isPdfResumeFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

const KNOWN_SKILL_KEYWORDS: ReadonlyArray<string> = [
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Node",
  "React",
  "Next.js",
  "Vue",
  "Nuxt",
  "Svelte",
  "Angular",
  "Python",
  "Django",
  "FastAPI",
  "Flask",
  "Go",
  "Golang",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "PHP",
  "Laravel",
  "Ruby",
  "Rails",
  "C#",
  ".NET",
  "C++",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQL",
  "GraphQL",
  "REST",
  "gRPC",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "Linux",
  "Git",
  "TailwindCSS",
  "Tailwind",
  "Figma",
  "Photoshop",
  "Illustrator",
];

function extractSkillsFromText(text: string): Array<string> {
  const lower = text.toLowerCase();
  const out: Array<string> = [];
  const seen = new Set<string>();
  for (const skill of KNOWN_SKILL_KEYWORDS) {
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    if (lower.includes(key)) {
      seen.add(key);
      out.push(skill);
    }
    if (out.length >= 12) break;
  }
  return out;
}

function screeningErrorResponse(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  const statusCode =
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 502;
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  const detail =
    error &&
    typeof error === "object" &&
    "detail" in error &&
    typeof (error as { detail: unknown }).detail === "string"
      ? (error as { detail: string }).detail
      : undefined;
  if (statusCode === 502) {
    return {
      status: statusCode,
      body: {
        error: message,
        ...(detail ? { detail } : {}),
      },
    };
  }
  return { status: statusCode, body: { error: message } };
}

export const applicantRoutes = new Elysia({ prefix: "/applicants" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query, user }) => {
      const search = query.search?.trim() ?? "";
      const jobDescriptionId = query.jobDescriptionId?.trim();
      const source = query.source as ApplicantSource | undefined;

      const where: Prisma.ApplicantWhereInput = {};
      if (jobDescriptionId) {
        where.jobDescriptionId = jobDescriptionId;
      }
      if (source) {
        where.source = source;
      }

      const applicants = await prisma.applicant.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          notes: true,
          cvText: true,
          cvFileKey: true,
          cvFileName: true,
          jobPostingUrl: true,
          latestRole: true,
          skills: true,
          experiences: true,
          educations: true,
          appliedAt: true,
          source: true,
          stage: true,
          resumes: {
            select: {
              id: true,
              fileKey: true,
              fileName: true,
              size: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          jobDescription: { select: { id: true, title: true } },
          screeningResult: {
            select: {
              overallScore: true,
              skillFit: true,
              experienceFit: true,
              cultureFit: true,
              strengths: true,
            },
          },
          interviews: applicantInterviewSubset(user!.id),
        },
        orderBy: { appliedAt: "desc" },
      });

      let list = applicants.map((row) => {
        const fromScreening = applicantListFields(row.screeningResult);
        const ivPayload = mapApplicantInterviewPayload(
          row.interviews as unknown as Array<ApplicantInterviewMapRow>,
        );
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          notes: row.notes,
          cvText: row.cvText,
          cvFileKey: row.cvFileKey,
          cvFileName: row.cvFileName,
          jobPostingUrl: row.jobPostingUrl,
          latestRole: row.latestRole,
          skills: row.skills,
          experiences: row.experiences as Array<PrismaJson.ApplicantExperience>,
          educations: row.educations as Array<PrismaJson.ApplicantEducation>,
          resumes: row.resumes.map((resume) => ({
            id: resume.id,
            fileKey: resume.fileKey,
            fileName: resume.fileName,
            size: resume.size ?? null,
            mimeType: resume.mimeType ?? null,
            createdAt: resume.createdAt.toISOString(),
          })),
          appliedAt: row.appliedAt.toISOString(),
          source: row.source,
          stage: row.stage,
          jobDescriptionId: row.jobDescription.id,
          positionTitle: row.jobDescription.title,
          interviews: ivPayload.interviews,
          interview: ivPayload.interview,
          ...fromScreening,
        };
      });

      if (search.length > 0) {
        const lower = search.toLowerCase();
        list = list.filter((a) => {
          if (
            a.name.toLowerCase().includes(lower) ||
            a.email.toLowerCase().includes(lower)
          ) {
            return true;
          }
          for (const tag of a.tags) {
            if (tag.toLowerCase().includes(lower)) {
              return true;
            }
          }
          if (a.notes?.toLowerCase().includes(lower)) {
            return true;
          }
          return false;
        });
      }

      return { applicants: list };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        jobDescriptionId: t.Optional(t.String()),
        source: t.Optional(sourceUnion),
      }),
      detail: { tags: ["applicants"], summary: "List applicants" },
    },
  )
  .post(
    "/scrape-job-url",
    async ({ body, set }) => {
      const url = body.url.trim();
      if (!URL.canParse(url)) {
        set.status = 400;
        return { error: "URL ไม่ถูกต้อง" };
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "user-agent":
              "Mozilla/5.0 (compatible; HR-Recruit-Bot/1.0; +https://example.com/bot)",
            accept: "text/html,application/xhtml+xml",
          },
        }).finally(() => clearTimeout(timeout));
        if (!res.ok) {
          set.status = res.status === 404 ? 404 : 502;
          return { error: `ดึงหน้าเว็บไม่สำเร็จ (${res.status})` };
        }
        const html = await res.text();
        const title = extractScrapedTitle(html);
        const description = extractScrapedMeta(html, "description");
        const text = stripHtml(html);
        const skills = extractSkillsFromText(`${description}\n${text}`);
        return {
          url,
          title,
          description,
          latestRole: title,
          skills,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ดึงข้อมูลไม่สำเร็จ";
        set.status = 502;
        return { error: message };
      }
    },
    {
      body: t.Object({ url: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["applicants"],
        summary: "Fetch data from job posting URL",
      },
    },
  )
  .post(
    "/scrape-profile-url",
    async ({ body, set }) => {
      const url = body.url.trim();
      if (!URL.canParse(url)) {
        set.status = 400;
        return { error: "URL ไม่ถูกต้อง" };
      }
      try {
        const result = await scrape(url);

        if (result.kind === "linkedin") {
          const p = result.data;
          const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
          const latestRole =
            p.currentPosition?.[0]?.position?.trim() ??
            p.experience?.[0]?.position?.trim() ??
            "";
          const skills = Array.from(
            new Set(
              [...(p.topSkills ?? []), ...(p.skills?.map((s) => s.name) ?? [])]
                .map((s) => s?.trim() ?? "")
                .filter((s) => s.length > 0),
            ),
          );
          const experiences = (p.experience ?? [])
            .map((e) => {
              const description = e.description?.trim() ?? "";
              return {
                company: e.companyName?.trim() ?? "",
                role: e.position?.trim() ?? "",
                ...(description.length > 0 ? { description } : {}),
              };
            })
            .filter((e) => e.company && e.role);
          const educations = (p.education ?? [])
            .map((ed) => ({
              school: ed.schoolName?.trim() ?? "",
              degree: ed.degree?.trim() ?? "",
            }))
            .filter((ed) => ed.school && ed.degree);

          const mapped: ApplicantProfileMap = {
            name,
            email: (p.emails?.[0] ?? "").trim(),
            skills,
            experiences,
            educations,
            sourceSuggestion: "LINKEDIN",
            ...(latestRole ? { latestRole } : {}),
          };

          const lines: Array<string> = [];
          lines.push(`Name: ${name}`);
          if (p.headline) lines.push(`Headline: ${p.headline}`);
          if (p.location?.linkedinText)
            lines.push(`Location: ${p.location.linkedinText}`);
          if (p.about) lines.push(`\nAbout:\n${p.about}`);
          if (p.experience?.length) {
            lines.push("\nExperience:");
            for (const e of p.experience) {
              lines.push(
                `- ${e.position} @ ${e.companyName}${e.duration ? ` (${e.duration})` : ""}${e.location ? ` — ${e.location}` : ""}`,
              );
              if (e.description) lines.push(`  ${e.description}`);
            }
          }
          if (p.education?.length) {
            lines.push("\nEducation:");
            for (const ed of p.education) {
              lines.push(`- ${ed.degree} @ ${ed.schoolName}`);
            }
          }
          if (p.topSkills?.length) {
            lines.push(`\nTop Skills: ${p.topSkills.join(", ")}`);
          }

          return {
            url,
            source: "linkedin" as const,
            title: p.headline ?? name,
            mapped,
            resumeText: lines.join("\n"),
          };
        }

        const mapped = await mapProfileTextFromRaw({
          profileText: result.data.markdown,
          profileUrl: url,
        });
        return {
          url,
          source: "other" as const,
          title: result.data.title,
          mapped,
          resumeText: result.data.markdown,
        };
      } catch (error) {
        const statusCode =
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          typeof (error as { statusCode: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : 502;
        const message =
          error instanceof Error ? error.message : "ดึงข้อมูลไม่สำเร็จ";
        set.status = statusCode;
        return { error: message };
      }
    },
    {
      body: t.Object({ url: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["applicants"],
        summary:
          "Fetch profile data (LinkedIn structured / Firecrawl fallback)",
      },
    },
  )
  .post(
    "/map-profile-text",
    async ({ body, set }) => {
      const profileText = body.profileText.trim();
      const profileUrlRaw = body.profileUrl?.trim();
      try {
        const mapped = await mapProfileTextFromRaw({
          profileText,
          ...(profileUrlRaw && profileUrlRaw.length > 0
            ? { profileUrl: profileUrlRaw }
            : {}),
        });
        return { mapped };
      } catch (error) {
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      body: t.Object({
        profileText: t.String({ minLength: 1 }),
        profileUrl: t.Optional(t.String()),
      }),
      detail: {
        tags: ["applicants"],
        summary: "Map profile text to applicant fields with AI",
      },
    },
  )
  .post(
    "/analyze-draft",
    async ({ body, set }) => {
      const file = body.file;
      const cvText = body.cvText?.trim() ?? "";
      const jobDescriptionId = body.jobDescriptionId.trim();
      const strictness = body.strictness;
      if (!jobDescriptionId) {
        set.status = 400;
        return { error: "ต้องเลือกตำแหน่งงาน" };
      }
      try {
        const result = await evaluateResumeAgainstJob({
          jobDescriptionId,
          cvText: cvText || undefined,
          file: fileHasBytes(file) ? file : undefined,
          strictness,
        });
        return {
          report: result.report,
          detectedName: result.detectedName,
          detectedEmail: result.detectedEmail,
          matchedJobId: result.matchedJobId,
          matchedJobTitle: result.matchedJobTitle,
        };
      } catch (error) {
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      body: t.Object({
        jobDescriptionId: t.String({ minLength: 1 }),
        file: t.Optional(t.File({ maxSize: 8 * 1024 * 1024 })),
        cvText: t.Optional(t.String()),
        strictness: t.Optional(t.Numeric({ minimum: 0, maximum: 2 })),
      }),
      detail: {
        tags: ["applicants"],
        summary: "Analyze CV draft (applicant not saved)",
      },
    },
  )
  .post(
    "/parse-pdf-profile",
    async ({ body, set }) => {
      const file = body.file;
      if (!fileHasBytes(file)) {
        set.status = 400;
        return { error: "ต้องแนบไฟล์ PDF" };
      }
      try {
        const mapped = await mapProfileFromFile(file as File);
        return { mapped };
      } catch (error) {
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      body: t.Object({
        file: t.File({ maxSize: 8 * 1024 * 1024 }),
      }),
      detail: {
        tags: ["applicants"],
        summary: "Extract profile data from PDF CV with AI",
      },
    },
  )
  .post(
    "/submit",
    async ({ body, set, user }) => {
      let raw: unknown = body.payload;
      if (typeof body.payload === "string") {
        try {
          raw = JSON.parse(body.payload) as unknown;
        } catch {
          set.status = 400;
          return { error: "payload ไม่ใช่ JSON ที่อ่านได้" };
        }
      }
      const parsed = submitPayloadSchema.safeParse(raw);
      if (!parsed.success) {
        set.status = 400;
        return { error: "ข้อมูลไม่ถูกต้อง" };
      }
      const uploadFile = body.file;
      const hasFile = fileHasBytes(uploadFile);
      if (hasFile && !isPdfResumeFile(uploadFile as File)) {
        set.status = 400;
        return { error: "อนุญาตเฉพาะไฟล์ PDF" };
      }
      if (hasFile && !isR2Configured()) {
        set.status = 503;
        return {
          error: "ยังไม่ได้ตั้งค่า Cloudflare R2 (จำเป็นสำหรับอัปโหลด PDF)",
        };
      }
      const job = await prisma.jobDescription.findFirst({
        where: { id: parsed.data.jobDescriptionId, isActive: true },
      });
      if (!job) {
        set.status = 404;
        return { error: "ไม่พบตำแหน่งนี้" };
      }
      const hasReport = parsed.data.report !== undefined;
      const cvTrim = parsed.data.cvText?.trim() ?? "";
      const latestRoleTrim = parsed.data.latestRole?.trim() ?? "";
      const skills = parsed.data.skills
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const experiencesJson: Array<PrismaJson.ApplicantExperience> =
        parsed.data.experiences.map((e) => ({
          company: e.company.trim(),
          role: e.role.trim(),
          ...(e.description && e.description.trim().length > 0
            ? { description: e.description.trim() }
            : {}),
        }));
      const educationsJson: Array<PrismaJson.ApplicantEducation> =
        parsed.data.educations.map((e) => ({
          school: e.school.trim(),
          degree: e.degree.trim(),
        }));
      const dbSelect = {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        cvText: true,
        cvFileKey: true,
        cvFileName: true,
        latestRole: true,
        skills: true,
        experiences: true,
        educations: true,
        appliedAt: true,
        source: true,
        stage: true,
        jobDescription: { select: { id: true, title: true } },
        screeningResult: {
          select: {
            overallScore: true,
            skillFit: true,
            experienceFit: true,
            cultureFit: true,
            strengths: true,
          },
        },
        interviews: applicantInterviewSubset(user!.id),
      } as const;
      try {
        const applicant = await prisma.applicant.create({
          data: {
            name: parsed.data.name.trim(),
            email: parsed.data.email.trim(),
            phone: parsed.data.phone?.trim() || null,
            jobDescriptionId: parsed.data.jobDescriptionId,
            source: parsed.data.source ?? "OTHER",
            stage: hasReport ? "SCREENING" : "APPLIED",
            ...(cvTrim.length > 0 ? { cvText: cvTrim } : {}),
            ...(latestRoleTrim.length > 0
              ? { latestRole: latestRoleTrim }
              : {}),
            skills,
            experiences: experiencesJson,
            educations: educationsJson,
            ...(hasReport
              ? {
                  screeningResult: {
                    create: fitReportToScreeningScalars(parsed.data.report!),
                  },
                }
              : {}),
          },
          select: dbSelect,
        });

        let current = applicant;
        if (hasFile) {
          const pdfFile = uploadFile as File;
          const bytes = await pdfFile.arrayBuffer();
          const objectKey = resumeObjectKeyForApplicant(
            applicant.id,
            randomUUID(),
          );
          await putResumePdfToR2({
            objectKey,
            body: new Uint8Array(bytes),
            contentType: pdfFile.type || "application/pdf",
          });
          await prisma.applicantResume.create({
            data: {
              applicantId: applicant.id,
              fileKey: objectKey,
              fileName: pdfFile.name?.trim() || "resume.pdf",
              size: bytes.byteLength,
              mimeType: pdfFile.type || "application/pdf",
            },
          });
          current = await prisma.applicant.update({
            where: { id: applicant.id },
            data: {
              cvFileKey: objectKey,
              cvFileName: pdfFile.name?.trim() || "resume.pdf",
            },
            select: dbSelect,
          });
        }

        const fromScreening = applicantListFields(current.screeningResult);
        const ivPayload = mapApplicantInterviewPayload(
          current.interviews as unknown as Array<ApplicantInterviewMapRow>,
        );
        return {
          applicant: {
            id: current.id,
            name: current.name,
            email: current.email,
            phone: current.phone,
            notes: current.notes,
            cvText: current.cvText,
            cvFileKey: current.cvFileKey,
            cvFileName: current.cvFileName,
            latestRole: current.latestRole,
            skills: current.skills as Array<string>,
            experiences:
              current.experiences as Array<PrismaJson.ApplicantExperience>,
            educations:
              current.educations as Array<PrismaJson.ApplicantEducation>,
            appliedAt: current.appliedAt.toISOString(),
            source: current.source,
            stage: current.stage,
            jobDescriptionId: current.jobDescription.id,
            positionTitle: current.jobDescription.title,
            interviews: ivPayload.interviews,
            interview: ivPayload.interview,
            ...fromScreening,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
        set.status = 500;
        return { error: message };
      }
    },
    {
      body: t.Object({
        // Multipart: Eden may coerce a JSON string field into an object before validation.
        // Handler accepts both and runs submitPayloadSchema (zod) afterward.
        payload: t.Union([
          t.String({ minLength: 2 }),
          t.Record(t.String(), t.Unknown()),
        ]),
        file: t.Optional(t.File({ maxSize: 8 * 1024 * 1024 })),
      }),
      detail: {
        tags: ["applicants"],
        summary: "Add applicant (unified — with or without AI report)",
      },
    },
  )
  .get(
    "/:id/resume-url",
    async ({ params, set }) => {
      if (!isR2Configured()) {
        set.status = 503;
        return { error: "ยังไม่ได้ตั้งค่า Cloudflare R2" };
      }
      const applicant = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { cvFileKey: true, cvFileName: true },
      });
      if (!applicant?.cvFileKey) {
        set.status = 404;
        return { error: "ไม่มีไฟล์ resume" };
      }
      const url = await getResumeSignedDownloadUrl({
        objectKey: applicant.cvFileKey,
        filenameHint: applicant.cvFileName ?? "resume.pdf",
      });
      return { url };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["applicants"],
        summary: "Resume download link (signed URL)",
      },
    },
  )
  .get(
    "/:id/resumes-url",
    async ({ params, set }) => {
      if (!isR2Configured()) {
        set.status = 503;
        return { error: "ยังไม่ได้ตั้งค่า Cloudflare R2" };
      }
      const applicant = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: {
          cvFileKey: true,
          resumes: {
            select: {
              id: true,
              fileKey: true,
              fileName: true,
              size: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!applicant) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      const resumes = await Promise.all(
        applicant.resumes.map(async (resume) => {
          const url = await getResumeSignedDownloadUrl({
            objectKey: resume.fileKey,
            filenameHint: resume.fileName || "resume.pdf",
          });
          return {
            id: resume.id,
            fileKey: resume.fileKey,
            fileName: resume.fileName,
            size: resume.size ?? null,
            mimeType: resume.mimeType ?? null,
            createdAt: resume.createdAt.toISOString(),
            isPrimary: resume.fileKey === applicant.cvFileKey,
            url,
          };
        }),
      );
      return { resumes };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["applicants"],
        summary: "Preview/download links for all resumes (signed URLs)",
      },
    },
  )
  .post(
    "/:id/resume",
    async ({ params, body, set }) => {
      if (!isR2Configured()) {
        set.status = 503;
        return { error: "ยังไม่ได้ตั้งค่า Cloudflare R2" };
      }
      const file = body.file;
      if (!fileHasBytes(file)) {
        set.status = 400;
        return { error: "ต้องอัปโหลดไฟล์" };
      }
      const okPdf =
        file.type === "application/pdf" ||
        (file.name ?? "").toLowerCase().endsWith(".pdf");
      if (!okPdf) {
        set.status = 400;
        return { error: "รองรับเฉพาะ PDF" };
      }
      const existing = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { id: true, cvFileKey: true },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      const objectKey = resumeObjectKeyForApplicant(existing.id, randomUUID());
      const bytes = await file.arrayBuffer();
      try {
        await putResumePdfToR2({
          objectKey,
          body: new Uint8Array(bytes),
          contentType: file.type || "application/pdf",
        });
      } catch {
        set.status = 502;
        return { error: "อัปโหลดไฟล์ไม่สำเร็จ" };
      }
      const displayName = file.name?.trim() || "resume.pdf";
      await prisma.$transaction([
        prisma.applicantResume.create({
          data: {
            applicantId: existing.id,
            fileKey: objectKey,
            fileName: displayName,
            size: bytes.byteLength,
            mimeType: file.type || "application/pdf",
          },
        }),
        prisma.applicant.update({
          where: { id: existing.id },
          data: { cvFileKey: objectKey, cvFileName: displayName },
        }),
      ]);
      return {
        cvFileKey: objectKey,
        cvFileName: displayName,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        file: t.File({ maxSize: 8 * 1024 * 1024 }),
      }),
      detail: { tags: ["applicants"], summary: "Upload resume PDF to R2" },
    },
  )
  .delete(
    "/:id/resume",
    async ({ params, set }) => {
      const existing = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: { id: true, cvFileKey: true },
      });
      if (!existing) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      if (existing.cvFileKey && isR2Configured()) {
        try {
          await deleteResumeFromR2(existing.cvFileKey);
        } catch {
          /* ignore */
        }
      }
      await prisma.applicant.update({
        where: { id: existing.id },
        data: { cvFileKey: null, cvFileName: null },
      });
      return { ok: true as const };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["applicants"], summary: "Delete resume file from R2" },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set, user }) => {
      try {
        const data: Prisma.ApplicantUpdateInput = {};
        if (body.stage !== undefined) {
          data.stage = body.stage as ApplicantStage;
        }
        if (body.notes !== undefined) {
          const n = body.notes.trim();
          data.notes = n.length > 0 ? n : null;
        }
        if (body.cvText !== undefined) {
          const cv = body.cvText.trim();
          data.cvText = cv.length > 0 ? cv : null;
        }
        if (body.name !== undefined) {
          const n = body.name.trim();
          if (n.length > 0) data.name = n;
        }
        if (body.email !== undefined) {
          const e = body.email.trim();
          if (e.length > 0) data.email = e;
        }
        if (body.phone !== undefined) {
          const p = body.phone.trim();
          data.phone = p.length > 0 ? p : null;
        }
        if (body.source !== undefined) {
          data.source = body.source;
        }
        if (body.experiences !== undefined) {
          const experiences: Array<PrismaJson.ApplicantExperience> = [];
          for (const item of body.experiences) {
            const company = item.company.trim();
            const role = item.role.trim();
            const description = item.description?.trim() ?? "";
            if (company.length === 0 || role.length === 0) continue;
            experiences.push({
              company,
              role,
              ...(description.length > 0 ? { description } : {}),
            });
          }
          data.experiences = experiences;
        }
        if (body.educations !== undefined) {
          const educations: Array<PrismaJson.ApplicantEducation> = [];
          for (const item of body.educations) {
            const school = item.school.trim();
            const degree = item.degree.trim();
            if (school.length === 0 || degree.length === 0) continue;
            educations.push({ school, degree });
          }
          data.educations = educations;
        }
        if (Object.keys(data).length === 0) {
          set.status = 400;
          return { error: "ต้องส่งข้อมูลที่ต้องการอัปเดตอย่างน้อยหนึ่งค่า" };
        }
        const updated = await prisma.applicant.update({
          where: { id: params.id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(user!.id),
          },
        });
        const fromScreening = applicantListFields(updated.screeningResult);
        const ivPayload = mapApplicantInterviewPayload(
          updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
        );
        return {
          applicant: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            notes: updated.notes,
            cvText: updated.cvText,
            cvFileKey: updated.cvFileKey,
            cvFileName: updated.cvFileName,
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
            interviews: ivPayload.interviews,
            interview: ivPayload.interview,
            ...fromScreening,
          },
        };
      } catch {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        stage: t.Optional(stageUnion),
        notes: t.Optional(t.String({ maxLength: 16_000 })),
        cvText: t.Optional(t.String({ maxLength: 100_000 })),
        name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        email: t.Optional(t.String({ maxLength: 300 })),
        phone: t.Optional(t.String({ maxLength: 50 })),
        source: t.Optional(sourceUnion),
        experiences: t.Optional(
          t.Array(
            t.Object({
              company: t.String({ maxLength: 200 }),
              role: t.String({ maxLength: 200 }),
              description: t.Optional(t.String({ maxLength: 4_000 })),
            }),
          ),
        ),
        educations: t.Optional(
          t.Array(
            t.Object({
              school: t.String({ maxLength: 200 }),
              degree: t.String({ maxLength: 200 }),
            }),
          ),
        ),
      }),
      detail: { tags: ["applicants"], summary: "Update applicant" },
    },
  )
  .post(
    "/:id/screen",
    async ({ params, set, user }) => {
      const applicant = await prisma.applicant.findFirst({
        where: { id: params.id },
        select: {
          id: true,
          jobDescriptionId: true,
          cvText: true,
          cvFileKey: true,
          cvFileName: true,
        },
      });
      if (!applicant) {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
      try {
        let evalResult: Awaited<ReturnType<typeof evaluateResumeAgainstJob>>;
        if (applicant.cvFileKey) {
          if (!isR2Configured()) {
            set.status = 503;
            return {
              error:
                "ยังไม่ได้ตั้งค่า Cloudflare R2 - ไม่สามารถอ่านไฟล์ PDF จากเซิร์ฟเวอร์ได้",
            };
          }
          const { bytes, contentType } = await getResumePdfBytesFromR2(
            applicant.cvFileKey,
          );
          evalResult = await evaluateResumeAgainstJob({
            jobDescriptionId: applicant.jobDescriptionId,
            pdfBuffer: bytes,
            pdfFilename: applicant.cvFileName ?? "resume.pdf",
            pdfMediaType: contentType,
            cvText: applicant.cvText ?? undefined,
          });
        } else if (applicant.cvText?.trim()) {
          evalResult = await evaluateResumeAgainstJob({
            jobDescriptionId: applicant.jobDescriptionId,
            cvText: applicant.cvText,
          });
        } else {
          set.status = 400;
          return {
            error:
              "ไม่มีข้อมูล resume - วางข้อความหรืออัปโหลด PDF ก่อนวิเคราะห์",
          };
        }
        const screeningData = fitReportToScreeningScalars(evalResult.report);
        await prisma.screeningResult.upsert({
          where: { applicantId: applicant.id },
          create: {
            applicantId: applicant.id,
            ...screeningData,
          },
          update: screeningData,
        });
        const updated = await prisma.applicant.findFirst({
          where: { id: applicant.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            cvText: true,
            cvFileKey: true,
            cvFileName: true,
            appliedAt: true,
            source: true,
            stage: true,
            jobDescription: { select: { id: true, title: true } },
            screeningResult: {
              select: {
                overallScore: true,
                skillFit: true,
                experienceFit: true,
                cultureFit: true,
                strengths: true,
              },
            },
            interviews: applicantInterviewSubset(user!.id),
          },
        });
        if (!updated) {
          set.status = 404;
          return { error: "ไม่พบผู้สมัคร" };
        }
        const fromScreening = applicantListFields(updated.screeningResult);
        const ivPayload = mapApplicantInterviewPayload(
          updated.interviews as unknown as Array<ApplicantInterviewMapRow>,
        );
        return {
          applicant: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            notes: updated.notes,
            cvText: updated.cvText,
            cvFileKey: updated.cvFileKey,
            cvFileName: updated.cvFileName,
            appliedAt: updated.appliedAt.toISOString(),
            source: updated.source,
            stage: updated.stage,
            jobDescriptionId: updated.jobDescription.id,
            positionTitle: updated.jobDescription.title,
            interviews: ivPayload.interviews,
            interview: ivPayload.interview,
            ...fromScreening,
          },
        };
      } catch (error) {
        const { status, body: errBody } = screeningErrorResponse(error);
        set.status = status;
        return errBody;
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["applicants"],
        summary: "Analyze resume with AI (save screening result)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        await prisma.applicant.delete({ where: { id: params.id } });
        return { ok: true as const };
      } catch {
        set.status = 404;
        return { error: "ไม่พบผู้สมัคร" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["applicants"], summary: "Delete applicant" },
    },
  );
