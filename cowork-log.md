### [2026-05-12] - Multi-interview applicants: API + tracker + detail + schedule overlap

**Prompt:** Implement grilled spec — unlimited meets per applicant; `interviews[]` + computed `interview`; tracker incoming/+N/last; detail preview + sections; schedule overlap warn; Thai relative times; 60s clock.

**Output:** `applicantInterviewSubset` loads all organizer interviews (asc); `mapApplicantInterviewPayload` + `computePrimaryInterview`. Types gain `interviews`. Tracker card uses `trackerCardMeetSummary` + `useNowMs`. Detail: `ApplicantDetailMeetPreview`, interview section upcoming/past with `formatDistance*` + in-progress badge. Schedule dialog: `existingInterviews` + `applicantInterviewOverlapMessage`. Calendar picker lists all applicants. Footer always shows schedule.

**Edited:** `applicant.ts`, `types.ts`, `applicant-interview-helpers.ts`, `use-now-ms.ts`, `tracker-card.tsx`, `applicant-detail-*`, `applicant-schedule-interview-dialog.tsx`, `interviews-calendar.tsx`, `mutations.ts`, `cowork-log.md`

### [2026-05-12] - Grill-me: multi-interview applicant UX + API

**Prompt:** `/grill-me` — unlimited meets per applicant; tracker incoming/+N; detail list sections; schedule overlap warn; relative badges (A+C); dual API fields; 60s tick; Thai locale.

**Output:** Locked spec: next incoming + `+N more`; incoming until end of slot; no-upcoming → last meet ago; dialog upcoming↑ past↓; overlap warn allow; per-row countdown + in-progress in window; `interviews` + computed `interview`; interval ~60s; `date-fns` `th`.

**Edited:** `cowork-log.md`

### [2026-05-12] - Tracker card: Meet creation status badge

**Prompt:** `tracker-card.tsx` — show whether Google Meet was created (scheduled interview link) or not.

**Output:** Derived `hasMeet` from `row.interview?.googleMeetLink`, `hasInterview` from `row.interview`. Badges: emerald “มี Meet แล้ว”, amber “ยังไม่มี Meet” when interview exists but no link, muted “ยังไม่นัดสัมภาษณ์” when no interview. Wrapped with AI badge in a flex row; `VideoIcon` from lucide.

**Edited:** `src/features/applicants-tracker/components/tracker-card.tsx`, `cowork-log.md`

### [2026-05-12] - POST /applicants/submit: accept object payload (multipart coercion)

**Prompt:** Validation error — `payload` expected string but received parsed object (Eden multipart / Elysia).

**Output:** Body schema now `t.Union([t.String({ minLength: 2 }), t.Record(t.String(), t.Unknown())])` so coerced JSON objects pass TypeBox; zod `submitPayloadSchema` remains the source of truth. Matches prior cowork note about multipart JSON fields being parsed before validation.

**Edited:** `src/server/routes/applicant.ts`, `cowork-log.md`

### [2026-05-12] - Add Applicant Dialog: shadcn Tabs for AI autofill (URL / Text / File)

**Prompt:** use shadcn tabs for the quick-fill tab strip at add-applicant-dialog.tsx ~764–786.

**Output:** Replaced manual `<button>` tab strip and ternary panel switching with controlled `Tabs` + `TabsList` + `TabsTrigger` + three `TabsContent` panels; kept `quickFillTab` state synced via `value` / `onValueChange`. Restyled triggers with `data-active:bg-primary` etc. to match prior pill look. Minor class order tweak on the amber hint `<p>`.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-12] - Add Applicant Dialog: rework to single-form flow with PDF autofill and inline AI scoring

**Prompt:** Rework AddApplicantDialog — remove multi-step flow, add File tab to autofill (AI parses PDF for profile data + attaches as CV), move AI scoring inline at bottom of form as a card, show result below card, localStorage draft persistence. Single `POST /applicants/submit` replaces 3 old routes; if report exists → create ScreeningResult + stage SCREENING, else stage APPLIED.

**Output:** Redesigned entire add-applicant flow: (1) single-page form replaces pick/manual/ai_review/ai_result steps; (2) autofill section has URL/Text/File tabs — File tab uses `parsePdfProfile` mutation to parse PDF into profile fields and attaches it as CV; (3) AI scoring card at bottom with strictness slider + Analyze button; (4) result expands below card inline; (5) localStorage draft auto-saves on every field change, restores with dismissible banner on re-open; (6) new `POST /submit` server route consolidates all three old creation routes; (7) `parse-pdf-profile` route added using `mapProfileFromFile`. Removed dead code: `withResumePayloadSchema`, `withScreeningPayloadSchema`, `collectResumeUploadFiles`, `AddApplicantAiCvMode`.

**Edited:** `src/lib/applicant-profile-map-service.ts`, `src/server/routes/applicant.ts`, `src/features/applicants-tracker/store/applicant-tracker-store.ts`, `src/features/applicants-tracker/api/mutations.ts`, `src/app/(dashboard)/candidates/page.tsx`, `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-12] - ApplicantPickerField: fix select inside schedule dialog

**Prompt:** ApplicantPickerField can't select

**Output:** Schedule dialog uses `DialogContent` at `z-100` while portaled `SelectContent` defaulted to `z-50`, so the dropdown drew under the dialog. Added `className="z-110"` on the picker `SelectContent`. Select `value`: map `""` to `undefined` for Radix controlled mode.

**Edited:** `src/features/interviews/components/interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-12] - Add applicant AI: strengths list like screening questions

**Prompt:** make strengths section (จุดแข็งหลัก) list like คำถามคัดกรอง

**Output:** Replaced Badge chip layout with numbered `<ol>` matching `คำถามคัดกรองที่แนะนำ`: `space-y-1.5`, each row `flex gap-2` + primary circular index + `text-xs text-muted-foreground` body.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-12] - Cowork log: newest-first reorder

**Prompt:** reorder cowork-log.md latest should be above

**Output:** Split file on `###` headings into 122 blocks; fixed one orphan `**Prompt**` (missing heading) before "Screener feature split" by inserting `### [2026-05-09] - Screener: tracker draft name/email from analyze`. Sorted globally newest-first: headers with `HH:mm` use that local time; date-only headers sort as end-of-day `23:59:59`; ties broken by original line order (later in file = newer). May 12 undated entries (README, evlog, toast migration, etc.) now appear above intra-day timestamps from that morning.

**Edited:** `cowork-log.md`

### [2026-05-12] - README Tech Stack: evlog

**Prompt:** Add evlog to Tech Stack in README.md

**Output:** Added Tech Stack table row: Observability → evlog (wide events, structured logging, Next/Elysia adapters, optional AI telemetry).

**Edited:** `README.md`, `cowork-log.md`

### [2026-05-12] - evlog AI observability (AI SDK)

**Prompt:** Add AI observability with evlog: `createAILogger` from `evlog/ai`, wrap model, `createEvlogIntegration` on `experimental_telemetry`, optional embed/cost map; install `ai`.

**Output:** `ai` was already a dependency. Added `src/lib/ai-evlog.ts` with `tryCreateRequestAILogger()` (`createAILogger(useLogger(), { cost: gemini… })` via `evlog/elysia` + `evlog/ai`) and `evlogTelemetryForAi()` returning `{ isEnabled: true, integrations: [createEvlogIntegration(ai)] }`. Wired `resume-screening-service` and `applicant-profile-map-service` to use `ai.wrap(fallbackModel)` and spread `experimental_telemetry` on both `generateText` paths; outside Elysia request context, falls back to unwrapped model and no telemetry. No `embed()` usage in repo yet—`ai.captureEmbed` not added.

**Edited:** `src/lib/ai-evlog.ts`, `src/lib/resume-screening-service.ts`, `src/lib/applicant-profile-map-service.ts`, `cowork-log.md`

### [2026-05-12] - Replace Sonner with react-hot-toast

**Prompt:** replace sonner to react-hot-toast

**Output:** Removed `sonner` dependency; added `react-hot-toast`. New client `Toaster` in [src/components/ui/hot-toast.tsx](src/components/ui/hot-toast.tsx) (`position="top-center"`, popover CSS vars, flat border, no shadow). Root layout imports it instead of `@/components/ui/sonner`. All `import { toast } from "sonner"` → default `import toast from "react-hot-toast"` across features; `toast.message(...)` in resume-screener → `toast(...)`. `toast.promise` in data-table unchanged (same API). Deleted `src/components/ui/sonner.tsx`.

**Edited:** `package.json`, `bun.lock`, `src/app/layout.tsx`, `src/components/ui/hot-toast.tsx`, 14 toast call sites, deleted `src/components/ui/sonner.tsx`, `cowork-log.md`

### [2026-05-12] - SelectedDayEventsPanel: visible Google Meet URL

**Prompt:** show google meet link in SelectedDayEventsPanel

**Output:** In `fullscreen-calendar.tsx` `SelectedDayEventsPanel`, added a details row (Video icon + “Google Meet ·”) after ผู้เข้าร่วม: full `meetUrl` as `Link` when not cancelled; cancelled events show strikethrough muted text. Dropdown join/copy unchanged. Fixed typo `เกินกำหsนด` → `เกินกำหนด` in `InterviewDbStatusBadge`.

**Edited:** `src/features/interviews/components/fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-12] - Pre-submit interview slot validation (useWatch + check-slot API)

**Prompt:** Implement plan: `POST /interviews/check-slot`, refactor schedule dialog to react-hook-form + `useWatch` + debounced slot precheck before submit.

**Output:** Added `evaluateInterviewSlotAvailability` helper and `POST /interviews/check-slot` in [src/server/routes/interview.ts](src/server/routes/interview.ts); create + patch now call the helper. [applicant-schedule-interview-dialog.tsx](src/features/applicants-tracker/components/applicant-schedule-interview-dialog.tsx) uses `useForm`/`zodResolver`, `useWatch` on datetime + duration, `useDebounceValue` 500ms, Eden `check-slot` with `AbortController` + monotonic request id to ignore stale responses; submit disabled on conflict/checking/error; final `check-slot` before `onScheduleInterview`. Props: `initialFormState` replaces lifted `formState`/`setFormState`. Callers: [applicant-detail-dialog.tsx](src/features/applicants-tracker/components/applicant-detail-dialog.tsx), [interviews-calendar.tsx](src/features/interviews/components/interviews-calendar.tsx). [schemas.ts](src/features/applicants-tracker/schemas.ts): `durationMinutes` is `z.number()` for RHF resolver typing.

**Edited:** `src/server/routes/interview.ts`, `src/features/applicants-tracker/components/applicant-schedule-interview-dialog.tsx`, `src/features/applicants-tracker/schemas.ts`, `src/features/applicants-tracker/components/applicant-detail-dialog.tsx`, `src/features/interviews/components/interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-12 12:16] - Integrate evlog (Next App Router)

**Prompt:** Install evlog, detect framework, set env.service to app name, useLogger + log.set in a route handler, createError for invalid input, curl locally and confirm one wide event in terminal.

**Output:** Project is Next.js 16 (Elysia mounted at `/api/[[...slugs]]`); used `createEvlog` from `evlog/next` per docs—not `evlog/elysia` on the Elysia tree (that path is for standalone Elysia). Added `src/lib/evlog.ts` with `env.service: hr-recruitment-pipeline` and `src/app/api/evlog-demo/route.ts` with `withEvlog`, `useLogger()` (Next API is zero-arg; handler param is `event: Request`), `log.set({ route, demo })`, and `createError` when `hello` query missing. `curl http://127.0.0.1:3010/api/evlog-demo` returned 400 JSON and dev log showed one pretty wide event (`[hr-recruitment-pipeline]` GET /api/evlog-demo 400 + context + error).

**Edited:** `package.json`, `bun.lock`, `src/lib/evlog.ts`, `src/app/api/evlog-demo/route.ts`, `cowork-log.md`

### [2026-05-12 00:52] - Fix LinkedIn type: compstring* → company* (real Apify response)

**Prompt:** Real Apify actor response uses `companyName` etc., not `compstringName` — mapper was silently filtering out every experience row.

**Output:** Rewrote [src/types/scraping.ts](src/types/scraping.ts): renamed `compstringName` / `compstringLinkedinUrl` / `compstringId` / `compstringUniversalName` / `compstringLogo` → `companyName` / `companyLinkedinUrl` / `companyId` / `companyUniversalName` / `companyLogo` on both `currentPosition[]` and `experience[]`. Tightened nullability from the live response: `topSkills`, `services`, `coverPicture`, `featured`, `coverPicture` → `T | null`; `currentPosition[].location` / `employmentType` / `workplaceType` / `description` → `string | null`; same for `experience[]`; `education[].schoolLogo` / `profileTopEducation[].schoolLogo` → `string | null`; `location.parsed.regionCode` → `string | null`. Kept `companyId` / `companyUniversalName` / `companyLogo` / `experienceGroupId` optional on `experience[]` because the third row in the sample (Y.I.M.) omits them.

Updated the inline mapper in [src/server/routes/applicant-routes.ts](src/server/routes/applicant-routes.ts) `/scrape-profile-url` LinkedIn branch: `e.compstringName` → `e.companyName` in both the `experiences` map and the synthesized resume text loop. Pulled the description trim into a local `description` to keep the truthy spread tidy now that the field is explicitly `string | null`.

Net effect: experience rows actually populate the dialog form on save; resume text dump shows `- Frontend Developer @ PTT Digital Solutions Company Limited (2 yrs 10 mos)` instead of `- Frontend Developer @ undefined`.

**Edited:** `src/types/scraping.ts`, `src/server/routes/applicant-routes.ts`, `cowork-log.md`

### [2026-05-12 00:46] - Client-side URL validation for Quick Fill link

**Prompt:** Validate the Quick Fill link input client-side using shadcn Field validation.

**Output:** Added linear `manualProfileUrlError` derivation right after `profileAnalyzePending` ([src/features/applicants-tracker/components/add-applicant-dialog.tsx](src/features/applicants-tracker/components/add-applicant-dialog.tsx)): if non-empty and `!URL.canParse` → "Invalid URL"; if hostname matches JobsDB (`jobsdb.com` / `.jobsdb.com` / `th.jobsdb.com` / `.jobsdb.th`) → "JobsDB ยังไม่รองรับ". Gated display behind `manualProfileUrlTouched` (set on first `onChange` and on `onBlur`) so an empty field doesn't flash red. Wrapped the Quick Fill link `Input` in `Field` + `FieldContent` + conditional `FieldError`; supported-links hint hides while the error is visible. `data-invalid` on the `Field`, `aria-invalid` on the `Input`. Analyze button now also disables when `manualProfileUrlError.length > 0`. `handleOpenChange` resets `manualProfileUrlTouched` alongside the URL on sheet close. Kept the toast.error fallbacks in `handleAnalyzeProfile` as belt-and-braces (defense if someone toggles disabled in devtools).

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-12 00:32] - Wire scrape() dispatcher into API + add-applicant-dialog

**Prompt:** Implement `scrape()` to API and `add-applicant-dialog.tsx`. Replace `/scrape-profile-url` to use the new dispatcher; one round-trip from the link tab.

**Output:** Rewrote `POST /applicants/scrape-profile-url` ([src/server/routes/applicant-routes.ts](src/server/routes/applicant-routes.ts)) to call `scrape(url)` from [src/server/lib/scraping.ts](src/server/lib/scraping.ts). LinkedIn branch: inline `ScrapedLinkedinProfile` → `ApplicantProfileMap` mapper (name from first+last, email from `emails[0]` — empty under "no email" mode, latestRole from `currentPosition[0].position` ?? `experience[0].position`, deduped skills from `topSkills` ∪ `skills[].name`, filtered `experience` / `education` rows). Also synthesizes a `resumeText` dump (headline, location, about, exp lines `position @ compstringName (duration) — location`, education, top skills) so downstream AI screening still has prose. Other branch: feeds Firecrawl markdown into existing `mapProfileTextFromRaw` and returns the markdown as `resumeText`. Response shape: `{ url, source: "linkedin" | "other", title, mapped, resumeText }`. Error handler keeps the existing statusCode narrowing. Removed duplicate `mapProfileTextFromRaw` import (one absolute + one relative). Dropped `scrapeCandidateProfileUrl` import — [src/server/lib/profile-url-scrape.ts](src/server/lib/profile-url-scrape.ts) has no consumers now but kept (out of scope to delete).

Mutation cast in [src/features/applicants-tracker/api/mutations.ts](src/features/applicants-tracker/api/mutations.ts) `scrapeProfileUrl` updated to the new shape.

Dialog ([src/features/applicants-tracker/components/add-applicant-dialog.tsx](src/features/applicants-tracker/components/add-applicant-dialog.tsx)) `handleAnalyzeProfile` link branch: client-side JobsDB host guard (`*.jobsdb.com` / `*.jobsdb.hk` / `hk.jobsdb.com`) toasts `"JobsDB scraping ยังไม่รองรับ"` and short-circuits before the round-trip. On success, `setValue("resumeText", result.resumeText)` + `applyMappedProfile(result.mapped)` in one go — dropped the chained `mapProfileText.mutateAsync` call (saves ~1 Gemini call per LinkedIn scrape). Text-tab branch and `ai_review` flow untouched.

All four touched files lint-clean.

**Edited:** `src/server/routes/applicant-routes.ts`, `src/features/applicants-tracker/api/mutations.ts`, `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-12 00:14] - scrape(link) dispatcher in scraping.ts

**Prompt:** Implement linear `scrape(link)` in `src/server/lib/scraping.ts` — auto-detect LinkedIn / JobsDB / fallback. LinkedIn via Apify actor `LpVuK3Zozwuipa5bp` (`profileScraperMode: "Profile details no email ($4 per 1k)"`, `queries: [link]`), JobsDB commented stub, fallback via Firecrawl. No component wiring yet.

**Output:** Single top-to-bottom function (no extracted helpers): parse URL (→ 400), lowercase `hostname`, `if linkedin / else if jobsdb / else firecrawl`. LinkedIn branch uses existing `apifyClient` from `@/lib/apify`, calls actor with `waitSecs: 120`, reads `dataset(run.defaultDatasetId).listItems()`, casts `items[0]` to `ScrapedLinkedinProfile` from `@/types/scraping`. JobsDB branch throws `501` with `// TODO` lines outlining the future actor call so the same place is easy to edit. Firecrawl branch dynamically imports `@mendable/firecrawl-js` (already pulled in transitively via `firecrawl-aisdk`), calls `fc.v1.scrapeUrl(link, { formats: ["markdown"], onlyMainContent: true })`, narrows the result the same way `profile-url-scrape.ts` does, and returns `{ kind: "other", url, data: { title, markdown } }`. Public surface is a discriminated union `ScrapeResult` (`linkedin` / `other`). All failures throw `Object.assign(new Error(msg), { statusCode })` matching the existing pattern. Lints clean.

**Edited:** `src/server/lib/scraping.ts`, `cowork-log.md`

### [2026-05-11] - Add applicant: manual JD URL, lists, multi-PDF

**Prompt:** Implement plan: move job posting URL to manual; experience/education/certificate dynamic lists; remove plain-text CV in manual; multi-file dropzone; Prisma Applicant fields + ApplicantResume; shadcn Field + RHF.
**Output:** Schema `jobPostingUrl`, `experiences`/`educations`/`certificates` Json[], `ApplicantResume`; migration applied. Store: `addResumeFiles[]`, `addJobPostingUrl`, list flush setters; removed AI JD fetch state. `POST /with-resume` accepts `files[]` + extended JSON payload, uploads each PDF to R2 + resume rows, primary `cvFileKey` = first file. Dialog: FieldGroup manual form, `useFieldArray` for three lists, multi-PDF manual dropzone, job URL in manual only; AI step JD URL removed; AI PDF stays single-file via `setAddResumeFiles([file])`. Mutations + analyze/confirm use first file from array.
**Edited:** `prisma/schema.prisma`, migration, `applicant-tracker-store.ts`, `add-applicant-dialog.tsx`, `mutations.ts`, `applicant-routes.ts`, `cowork-log.md`

### [2026-05-11] - Add Applicant: shadcn Select for Target Role

**Prompt:** Use shadcn Select component for target role.

**Output:** Replaced native `<select>` with `Select` / `SelectTrigger` / `SelectValue` / `SelectContent` / `SelectGroup` / `SelectItem` from `@/components/ui/select` for both manual flow and AI review `jobId` field. Empty selection uses `value={field.value || undefined}` + `SelectValue placeholder="Select role"`. Full-width trigger (`className="w-full"`), `position="popper"` on content, `aria-invalid` + `FieldError` unchanged. AI review block now uses `Field` + `FieldLabel` + `FieldContent` instead of raw `Label` + `<p>` for errors.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 22:10] - AI Resume Screener: Analyze button gated on full form

**Prompt:** AI Resume Screener — cannot click Analyze after role, strictness, CV upload.

**Output:** `canAnalyze` incorrectly required `formState.isValid` (name, email, skills, etc.) while the AI sheet only collects job + CV. Switched to `addJobId` + `aiResumeReady` + jobs loading. `canAiConfirmSave` now validates name/email from the zustand store (what `aiConfirm` uses) via `addApplicantFormSchema.pick({ name, email })`, since post-analyze updates only touched the store, not RHF.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 21:35] - Quick Fill with AI card UI (link / raw text)

**Prompt:** Replace profile import UI with provided card + segmented Link / Raw Text controls.

**Output:** Swapped shadcn `Tabs` for a bordered `bg-secondary/30` card titled “Quick Fill with AI” with `SparklesIcon`, pill-style tab buttons (`link` / `text`), conditional link hint + URL input vs textarea, and shared **Analyze with AI** button. State renamed to `quickFillTab`; removed unused `tabs` import.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 21:20] - Profile import: single Analyze with AI (URL scrape + map)

**Prompt:** No Fetch button — paste URL and click Analyze with AI.

**Output:** Removed separate Fetch control on Profile URL tab. One **Analyze with AI** button runs scrape then map when URL tab is active, or map-only on Paste text tab. Renamed loading copy to “Analyzing…”, default profile tab `url`, removed unused `ScanEyeIcon` import.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 21:05] - Manual add: drop job posting URL, reorder import vs manual

**Prompt:** (1) remove job posting URL (2) move scrape above with separator between manual and scrape.

**Output:** Removed job posting URL field, `scrapeJobUrl` usage, and `jobPostingUrl` from the add-applicant form schema / defaults / watch. Moved “Import from profile” (tabs + fetch + map AI) to the top of the manual sheet, added a labeled `Separator` row (“Manual entry”), then the existing `FieldGroup` for role, contact, skills, PDF, experience/education.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 20:30] - Manual add applicant: profile tabs + AI map

**Prompt:** Profile URL / raw text tabs + AI field mapping (Manual flow); implement attached plan.

**Output:** Added `applicantProfileMapSchema` and `mapProfileTextFromRaw` (AI SDK `generateText` + structured output). Added shared `html-scrape-helpers`, `profile-url-scrape` (LinkedIn/JobsDB host allowlist, fetch + optional Firecrawl via `FIRECRAWL_API_KEY`), and Elysia routes `POST /applicants/scrape-profile-url` and `POST /applicants/map-profile-text`. Extended mutations and Manual sheet UI with shadcn `Tabs` (Profile URL vs Paste text), Fetch + Map-with-AI wiring into RHF/store; manual save allows PDF or non-empty resume text.

**Edited:** `src/features/applicants-tracker/lib/applicant-profile-map-schema.ts`, `src/server/lib/html-scrape-helpers.ts`, `src/server/lib/profile-url-scrape.ts`, `src/server/lib/applicant-profile-map-service.ts`, `src/server/routes/applicant-routes.ts`, `src/features/applicants-tracker/api/mutations.ts`, `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 19:47] - Remove inline resume PDF preview

**Prompt:** remove preview (react-pdf) feature

**Output:** Removed the inline resume preview flow from `ApplicantDetailResumeSection`: deleted `react-pdf` imports/worker setup and `PdfPreview` renderer, removed preview-selection state, and simplified the resume list to metadata + `เปิดไฟล์` action per file (new tab only). Kept existing upload/download/delete behavior for primary resume and text-note editing unchanged. Uninstalled `react-pdf` from dependencies.

**Edited:** `src/features/applicants-tracker/components/applicant-detail-resume-section.tsx`, `package.json`, `bun.lock`, `cowork-log.md`

### [2026-05-11 18:10] - Applicant detail sheet uses ScrollArea

**Prompt:** add `src/components/ui/scroll-area.tsx`

**Output:** Integrated shadcn `ScrollArea` into `ApplicantDetailDialog` sheet content. Converted sheet body to `p-0`, wrapped the main detail sections with `ScrollArea` (`flex-1`) and moved content into an inner vertical stack (`gap-4`, `pb-4`) so long applicant details scroll independently while footer actions stay accessible.

**Edited:** `src/features/applicants-tracker/components/applicant-detail-dialog.tsx`, `cowork-log.md`

### [2026-05-11 18:07] - Applicant detail dialog to shadcn Sheet

**Prompt:** convert it to /shadcn sheet

**Output:** Converted `ApplicantDetailDialog` container from shadcn `Dialog` to shadcn `Sheet` with right-side panel behavior. Replaced `Dialog*` primitives with `Sheet*` equivalents (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter`) and kept existing close/open and footer actions intact. Applied width override for right panel (`data-[side=right]:sm:max-w-2xl`) and kept hidden title for accessibility.

**Edited:** `src/features/applicants-tracker/components/applicant-detail-dialog.tsx`, `cowork-log.md`

### [2026-05-11 18:03] - Applicant detail: edit experience and education

**Prompt:** make it can edit and display experience, education

**Output:** Added editable Experience/Education sections in `ApplicantDetailDialog` with add/remove row controls, inline inputs, sanitization (trim + drop empty rows), and save/cancel actions. Extended applicant patch mutation payload/types to support `experiences` and `educations`, including optimistic cache updates. Extended `PATCH /api/applicants/:id` request schema + server normalization logic to persist `Applicant.experiences` and `Applicant.educations` JSON arrays safely.

**Edited:** `src/features/applicants-tracker/components/applicant-detail-dialog.tsx`, `src/features/applicants-tracker/api/mutations.ts`, `src/server/routes/applicant-routes.ts`, `cowork-log.md`

### [2026-05-11 17:58] - Applicant detail: multi-resume preview + richer profile

**Prompt:** Display more applicant info from schema in detail dialog, use react-pdf for inline preview (no forced download), and make Resume/CV section show all files instead of one.

**Output:** Expanded applicant DTO/API payload to include schema fields (`jobPostingUrl`, `latestRole`, `skills`, `experiences`, `educations`) and `resumes[]`. Updated `/api/applicants` list mapping to return those fields, and added `GET /api/applicants/:id/resumes-url` that returns signed URLs for every resume entry. Updated resume upload flow to append `ApplicantResume` rows (instead of replacing history) while keeping `cvFileKey/cvFileName` as primary. Refactored detail UI: added latest role/skills/history/job-posting display in `applicant-detail-dialog.tsx`; rebuilt `ApplicantDetailResumeSection` with multi-file list, primary marker, and inline `react-pdf` preview (`Document`/`Page`) for selected resume.

**Edited:** `src/server/routes/applicant-routes.ts`, `src/features/applicants-tracker/lib/applicant-tracker-model.ts`, `src/features/applicants-tracker/components/applicant-detail-dialog.tsx`, `src/features/applicants-tracker/components/applicant-detail-resume-section.tsx`, `src/features/applicants-tracker/api/mutations.ts`, `cowork-log.md`

### [2026-05-11 17:46] - Remove `file` body from `/applicants/with-resume`

**Prompt:** Remove `file` from `/applicants/with-resume`; single upload must use `files` array.

**Output:** Updated `POST /applicants/with-resume` body schema to remove `file` and keep `files` as upload input. Updated `collectResumeUploadFiles()` contract to consume only `files`, preserving array handling plus compatibility for empty multipart object (`files: {}`). Verified caller already sends `{ payload, files }` in applicants mutation. Typecheck and lints pass.

**Edited:** `src/server/routes/applicant-routes.ts`, `cowork-log.md`

### [2026-05-11 17:35] - Fix /with-resume payload validation mismatch

**Prompt:** error with /resume route — backend validation expects `payload` string and `files` array, but request sends object payload and empty files object.

**Output:** Updated `POST /applicants/with-resume` to accept both `payload` as JSON string **or** object. Handler now parses JSON only when payload is a string; object payload goes straight into Zod validation. Relaxed `files` request schema to allow either file array or empty object so multipart clients that send `files: {}` no longer fail TypeBox validation before business logic runs. Kept existing resume file extraction behavior and validations.

**Edited:** `src/server/routes/applicant-routes.ts`, `cowork-log.md`

### [2026-05-11 17:29] - Add Applicant: Dialog → Sheet

**Prompt:** Convert shadcn Dialog to shadcn Sheet in add-applicant-dialog.tsx.

**Output:** Swapped `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` for `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`. Sheet slides in from the right (`side="right"`), width overridden to `data-[side=right]:sm:max-w-xl md:data-[side=right]:sm:max-w-2xl` so the form has breathing room (default sheet cap is `sm:max-w-sm`). Scroll container switched from `max-h-[75vh] overflow-y-auto` to `flex-1 overflow-y-auto` to fit the full-height sheet. Header padding compacted to `px-5 py-4` and gets `pr-8` to clear the built-in `SheetClose` × button. Component name `AddApplicantDialog` and file name kept intact to avoid touching `src/app/(dashboard)/candidates/page.tsx`. `tsc --noEmit` + lints clean.

**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-11 16:39] - Add Applicant Dialog v2 — Job URL fetch, skills/latestRole, drop certificates, typed JSON

**Prompt:** Move job posting URL to top with fetch button (scrape data into form), add optional description to experience rows, remove certificates, add latest job role + skills fields, wire prisma-json-types-generator into schema + `src/types/types.ts`.

**Output:** Schema: dropped `certificates Json[]`, added `latestRole String?` + `skills String[]`, and annotated `experiences`/`educations` with `/// [ApplicantExperience]` / `/// [ApplicantEducation]` for typed JSON output via `prisma-json-types-generator`. Migration `applicant_skills_latest_role_drop_certificates` applied. `src/types/types.ts` declares the matching `PrismaJson.ApplicantExperience` (with optional `description`) and `PrismaJson.ApplicantEducation` types. Store dropped all certificate state, added `addLatestRole` + `addSkills`, and widened experience draft with optional `description`. Backend `/applicants/with-resume` payload now persists `latestRole`/`skills`/experience description and no longer expects certificates. Added new `POST /applicants/scrape-job-url` route that fetches the URL, extracts `<title>` / `og:*` / `meta description`, and runs a keyword-based skill extractor — returns `{title, description, latestRole, skills}`. Dialog reflowed: Job Posting URL is now the first field with a Fetch button (calls scrape mutation, prefills latest role + merges skills), Experience rows gained a description textarea, Certificates section removed, new Latest Role input + Skills chip input (Enter/Comma to add, Backspace to remove last). Verified with `tsc --noEmit` + `eslint`.

**Edited:** `prisma/schema.prisma`, `prisma/migrations/20260511094033_applicant_skills_latest_role_drop_certificates/migration.sql`, `src/types/types.ts`, `src/features/applicants-tracker/store/applicant-tracker-store.ts`, `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `src/features/applicants-tracker/api/mutations.ts`, `src/server/routes/applicant-routes.ts`, `cowork-log.md`

### [2026-05-11 15:50] - Implement AI strictness end-to-end

**Prompt:** implement ai strictness feature to backend `src/server/lib/resume-screening-service.ts` and wire full stack
**Output:** Added strictness-aware screener prompting with levels `0|1|2` (lenient/balanced/strict), normalization defaulting to balanced, and evaluator input support in `evaluateResumeAgainstJob`. Threaded optional `strictness` through both backend analyze endpoints (`/applicants/analyze-draft` and `/screener/evaluate`) with request schema validation (`0..2`). Wired frontend draft analyze mutation to send strictness from Zustand state, and aligned store default/reset strictness to `1` to match slider domain.
**Edited:** `src/features/screener/lib/screener-prompts.ts`, `src/server/lib/resume-screening-service.ts`, `src/server/routes/applicant-routes.ts`, `src/server/routes/screener-routes.ts`, `src/features/applicants-tracker/api/mutations.ts`, `src/features/applicants-tracker/store/applicant-tracker-store.ts`, `cowork-log.md`

### [2026-05-11 14:49] - Rework Add Applicant Dialog (Full New Fields)

**Prompt:** Rework Add Applicant Dialog (Full New Fields)

**Output:** Rebuilt add-applicant flow to `pick -> manual -> ai_review -> ai_result` with English UI copy and richer UX parity with the provided reference. Added new Zustand fields for AI mode (`addAiCvMode`, `addAiStrictness`, `addAiJdUrl`, `addFetchingJdUrl`) and reset wiring. Replaced dialog UI with mode cards, source chips, CV mode toggles, URL fetch simulation, strictness slider, and a full AI score-card result (recommendation badge, ring score, 3 fit dimensions + reasoning, strengths, suggested pre-screen questions, summary). Kept existing handler boundaries (`onManualSubmit`, `onAiAnalyze`, `onAiConfirmSubmit`) and updated candidates flow to transition to `ai_result` after analyze. Verified with ESLint + TypeScript checks.

**Edited:** `src/features/applicants-tracker/store/applicant-tracker-store.ts`, `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `src/app/(dashboard)/candidates/page.tsx`, `cowork-log.md`

### 2026-05-11 04:27 - Refactor TanStack Query hooks to queryOptions/mutationOptions pattern

**Prompt:** Migrate all `/api/` feature hooks to use `queryOptions`/`mutationOptions` factories instead of `return useQuery/useMutation` wrappers. Files named `queries.ts` and `mutations.ts`. Pattern from TanStack Query v5 docs.

**Output:** Created `queries.ts` and `mutations.ts` for 5 features (applicants-tracker, dashboard, interviews, jobs, screener). Updated 7 consumer files (candidates/page, jobs/page, dashboard/page, applicant-detail-resume-section, interviews-calendar, job-description-dialog, resume-screener) to use `useQuery(featureQueries.xxx())` and `useMutation(featureMutations.xxx(queryClient))` pattern. Mutations needing queryClient accept it as a parameter. Old `use-*.ts` files remain but are no longer imported.

**Edited:** 16 files created/modified. Zero new TS errors in new files.

### [2026-05-11 01:05] - Update README + .env.example

**Prompt:** Rewrite README in English: setup instructions + feature-based architecture explanation. Update .env.example to match.

**Output:** Full README rewrite — stack table, prerequisites (Node ≥20/pnpm ≥9/PG ≥15), quick start steps, env vars table (all vars documented with required flag), Google OAuth setup section (what's needed + links), deep feature-based architecture section (why vs type-based, annotated directory tree, what goes in each subfolder, shared code map, API layer, pipeline stages). Updated .env.example: removed stale Clerk vars and unused GOOGLE_TOKEN_ENCRYPTION_KEY, added comments with setup links.

**Edited:** README.md, .env.example

### [2026-05-11 00:49] - Fix 4 applicant tracker features

**Prompt:** Fix /with-screening add bug, add re-analyze AI button, inline edit applicant data, status badges in calendar/interview views

**Output:**

1. `/with-screening` bug — Eden Treaty sends multipart body; Elysia coerces JSON string `payload` field to object before TypeBox validation. Fixed by removing `JSON.stringify`/`JSON.parse` envelope — server body now accepts flat fields (`jobDescriptionId`, `name`, `email`, `source`, `report: t.Any()`, `file`), client sends raw object.
2. Re-analyze AI — `ApplicantDetailAiScores` `hasData` branch had no button. Added "วิเคราะห์ใหม่" ghost button with `RefreshCwIcon` next to scores header row.
3. Inline edit — Extended PATCH `/:id` server route to accept `name`/`email`/`phone`/`source`. Added `HeaderInlineEdit` (for name/email in dialog header) and `InlineEditRow`/`InlineSelectRow` for phone/source in detail grid. Save on blur/Enter, escape to cancel.
4. Status badges — `interview-routes.ts` calendar-events endpoint now fetches `status` from DB (removed `CANCELLED` filter). Added `interviewDbStatus` to `GoogleCalendarListEvent` type, `Event` interface, and feed mapping. `InterviewDbStatusBadge` component computes OVERDUE (SCHEDULED + end past), shows CANCELLED/RESCHEDULED badges in `SelectedDayEventsPanel` and `InterviewMeetCard`. Grid cell events get colored left border.

**Edited:** applicant-routes.ts, interview-routes.ts, use-applicants-mutations.ts, applicant-detail-ai-scores.tsx, applicant-detail-dialog.tsx, candidates/page.tsx, google-calendar-list-event.ts, google-calendar-feed.ts, fullscreen-calendar.tsx, applicant-detail-interview-section.tsx

### [2026-05-10] - /impeccable layout: calendar

**Prompt:** /impeccable layout: calendar
**Output:** Reflowed `FullScreenCalendar`: stronger split between grid and day panel (`gap-5` / `lg:gap-8`), header rhythm (`md:px-5`, title stack `gap-0.5`, controls `gap-3` / `xl:flex-row`), weekday strip `bg-muted/30`, flat month nav (removed shadow; `overflow-hidden` group). Desktop grid: dropped fixed `grid-rows-5` for `lg:auto-rows-[minmax(6.5rem,1fr)]` so six-week months lay out correctly; removed dead `useMediaQuery` branch (lg-only grid always used rich cell). Sidebar width stepped `lg:max-w-md` then `xl:max-w-lg`. Event chips `rounded-md` + `bg-muted/40`. Preflight: no PRODUCT/load-context in repo.
**Edited:** `fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-10] - Postpone interview time from calendar

**Prompt:** add postpone appointment time feature
**Output:** Calendar feed enriched with `interviewId` (Prisma match on `googleEventId`) + `durationMinutes` (Google window); sidebar **`เลื่อนเวลา`** opens `PostponeInterviewDialog` (datetime + duration) calling PATCH `/interviews/:id` via `usePatchInterviewMutation` (Google Calendar sync already server-side). Only linked future interviews show postpone.
**Edited:** `google-calendar-list-event.ts`, `google-calendar-service.ts`, `interview-routes.ts`, `google-calendar-feed.ts`, `fullscreen-calendar.tsx`, `postpone-interview-dialog.tsx`, `use-interviews.ts`, `interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-10] - Move screening into Applicant Tracker

**Prompt:** Move resume screening into tracker; add flow manual vs AI; analyze later for manual; tracker card shows unscreened; retire standalone screener nav/route.
**Output:** Shared `resume-screening-service.ts` + `getResumePdfBytesFromR2`; applicant routes: `cvText` on `POST /`, `POST /analyze-draft`, `POST /with-resume`, `POST /with-screening`, `POST /:id/screen`; refactored `screener-routes` to use service. Tracker: zustand add-flow state, rebuilt `AddApplicantDialog` (pick → manual | AI review → confirm), candidates mutations + detail “วิเคราะห์ด้วย AI”. Board/table badges `ยังไม่วิเคราะห์ AI`. Sidebar removed `/screener`; `screener/page.tsx` redirects to `/candidates`. Jobs/resume copy tweaks.
**Edited:** `src/server/lib/resume-screening-service.ts`, `src/lib/r2.ts`, `src/server/routes/screener-routes.ts`, `src/server/routes/applicant-routes.ts`, `applicant-tracker-store.ts`, `add-applicant-dialog.tsx`, `candidates/page.tsx`, `applicant-detail-dialog.tsx`, `applicant-detail-ai-scores.tsx`, `tracker-card.tsx`, `applicant-tracker-table.tsx`, `app-sidebar.tsx`, `screener/page.tsx`, `jobs/page.tsx`, `job-form-dialog.tsx`, `applicant-detail-resume-section.tsx`, `cowork-log.md`

### [2026-05-10] - ลบผลวิเคราะห์/ประวัติ screener + ScreenerHistory

**Prompt:** ลบผลการวิเคราะห์และประวัติออก พร้อม prisma model
**Output:** ลบ `ScreenerHistory` จาก schema + migration `20260510180000_drop_screener_history`; ตัด `GET/DELETE /screener/history` และการ persist หลัง evaluate; UI เหลือฟอร์ม (`max-w-2xl`) + dialog รายงานหลังวิเคราะห์; ลบ `screener-history-panel.tsx`, `screener-result-summary.tsx`; อัปเดตคำอธิบาย header
**Edited:** `schema.prisma`, `prisma/migrations/20260510180000_drop_screener_history/migration.sql`, `screener-routes.ts`, `resume-screener.tsx`, `resume-screener-header.tsx`, deleted `screener-history-panel.tsx`, `screener-result-summary.tsx`, `cowork-log.md`

### [2026-05-10] - Screener: summary + history one panel

**Prompt:** combine screener result summary and history to one place
**Output:** `ScreenerHistoryPanel` owns `currentResult` and renders `ScreenerResultSummary` `embedded` under "ผลลัพธ์ล่าสุด", then "บันทึกก่อนหน้า" + list/empty/skeleton. Title "ผลการวิเคราะห์และประวัติ". Left column only `ResumeInputCard` (`max-w-2xl`). `ScreenerResultSummary` gains `variant` (`card` | `embedded`). Form/header copy updated for single results column.
**Edited:** `screener-history-panel.tsx`, `screener-result-summary.tsx`, `resume-screener.tsx`, `resume-input-card.tsx`, `resume-screener-header.tsx`, `cowork-log.md`

### [2026-05-10] - Screener onboard + polish (form + history)

**Prompt:** /impeccable onboard and polish: form and history
**Output:** `load-context.mjs` had no PRODUCT/DESIGN.md; followed product register + onboard/polish refs. **Form:** `CardDescription` value prop, `Field`/`FieldDescription` for job + resume, fixed อัป spelling, textarea `aria-label`, analyze `aria-busy` + `aria-describedby` when blocked on job, contextual hints (post-success flow, mobile vs desktop history placement). **History:** skeleton loading + `aria-live`/`sr-only` instead of text-only empty loading; empty state two-tier copy (what appears, how to start) without em dash; list row `focus-visible` ring + `ease-out` transition; button copy โหลดเพิ่มเติม. Header description tightened to JD + history.
**Edited:** `resume-input-card.tsx`, `screener-history-panel.tsx`, `resume-screener-header.tsx`, `cowork-log.md`

### [2026-05-10] - Screener history: shadcn Empty state

**Prompt:** use shadcn empty component for empty state
**Output:** Replaced custom centered divs in `ScreenerHistoryPanel` with `Empty`, `EmptyHeader`, `EmptyMedia` (History icon), `EmptyTitle`, and `EmptyDescription` for no-history; loading uses `Empty` + `EmptyTitle` with muted text. `border-0` + `min-h-[240px]` so layout stays stable inside the card without double dashed borders.
**Edited:** `src/features/screener/components/screener-history-panel.tsx`, `cowork-log.md`

### [2026-05-10] - Kanban cross-column drag: max update depth fix

**Prompt:** check error with nextjs mcp and fix — dragging tracker card from board 1 to board 2 (above)
**Output:** Next.js devtools `get_errors` showed `Maximum update depth exceeded` with stack at `KanbanColumnContent` / `SortableContext`. Root cause: same-column `onDragOver` used `findIndex(over.id)`; when collision reports the column droppable id, index is `-1` and `arrayMove(..., -1)` maps to “near end”, causing repeated controlled reorder → infinite React updates. Fixed by treating `isColumn(over.id)` as append (`length`), skipping when `overIndex < 0`, guarding `activeIndex === -1`, deduping with `kanbanColumnsOrderEqual` before `setColumns`, and mirroring in `handleDragEnd`. Stabilized `getItemValue` with `useCallback` in applicant kanban view.
**Edited:** `src/components/reui/kanban.tsx`, `src/features/applicants-tracker/components/applicant-kanban-board-view.tsx`, `cowork-log.md`

### [2026-05-10] - Fit status labels + badge colors

**Prompt:** generate fit status and color
**Output:** Added `src/features/screener/lib/fit-status.ts` (`fitStatusLabel`, `fitStatusBadgeClassName`, `getFitStatusLabel`). `FitStatusBadge` wires outline Badge + semantic Tailwind tones (emerald → teal → amber → orange → red). Screener report shows badge; copy-paste report uses `getFitStatusLabel`. Fixed `formatReportText` using `.trim()` on enum.
**Edited:** `fit-status.ts`, `fit-status-badge.tsx`, `screener-report-panel.tsx`, `resume-screener-utils.ts`, `cowork-log.md`

### [2026-05-10] - Applicant notes: cancel/save in header row

**Prompt:** (TH) ยกเลิกและบันทึก อยู่ด้านบน
**Output:** In edit mode, `ยกเลิก` + `บันทึกหมายเหตุ` moved to the same top row as `หมายเหตุ` (flex-wrap); removed bottom action row.
**Edited:** `applicant-detail-notes-section.tsx`, `cowork-log.md`

### [2026-05-10] - Applicant notes: edit gate + top action

**Prompt:** (TH) move edit button to top (notes header); must click Edit before editing note
**Output:** Header row `หมายเหตุ` + `แก้ไข` (outline, pencil); textarea `readOnly` until edit; edit mode shows `ยกเลิก` + `บันทึกหมายเหตุ`. Display derives from `applicant.notes` when viewing; draft only while editing; exit edit after save when `notesSaving` drops and draft matches server (`key={applicant.id}` already resets on row switch).
**Edited:** `applicant-detail-notes-section.tsx`, `cowork-log.md`

### [2026-05-10] - Applicant detail: กำหนดนัด + Meet card

**Prompt:** Applicant Interview CTA Plan — ปุ่มกำหนดนัดเมื่อยังไม่มี Meet / conflict check; ถ้ามี Meet แสดงข้อมูลใต้ AI score + ลิงก์เข้าประชุม
**Output:** `GET|POST|PATCH /applicants` แนบ `interview` ล่าสุด (`SCHEDULED`|`RESCHEDULED`) ของ organizer ปัจจุบัน + interviewers; `TrackerApplicant.interview`; `ApplicantDetailInterviewSection` (ฟอร์ม datetime/duration/emails/notes + nested Dialog) + การ์ดสรุปนัด + `Meet` `target=_blank`; `ApplicantTracker` `POST /interviews` + invalidate `applicants` + `interviews-calendar-events` + อัปเดต detail + toast จากร่าง error (`DB_CONFLICT`/`GOOGLE_BUSY` ฯลฯ); `trackerInterviewFromScheduleResponse`; `POST /interviews` include interviewer `title`; cast Prisma `select` interviews→mapper เพราะ inference ไม่ติด nested select
**Edited:** `applicant-routes.ts`, `interview-routes.ts`, `applicant-tracker-model.ts`, `schedule-interview-schema.ts`, `applicant-detail-interview-section.tsx`, `applicant-detail-dialog.tsx`, `applicant-tracker.tsx`, `cowork-log.md`

### [2026-05-10] - Applicant detail: footer schedule + redirect หลังบันทึกนัด

**Prompt:** move schedule button to dialog footer (replace with schedule redirect); when schedule redirect to interviews page
**Output:** `applicant-schedule-interview-dialog.tsx` — dialog ฟอร์มแยกจากเนื้อหาหลัก (portal sibling); state form + open อยู่ `ApplicantDetailDialog`; footer: `กำหนดนัดสัมภาษณ์` เมื่อยังไม่มีนัด, `ไปหน้านัดสัมภาษณ์` → `router.push('/interviews')` แทน `<Link>`; section เดิมเหลือการ์ด/ข้อความว่าง; `scheduleInterviewMut` `onSuccess` → `setDetail(null)` + `router.push('/interviews')`; `key={detail?.id ?? 'closed'}` บน dialog รีเซ็ต state เมื่อสลับผู้สมัคร
**Edited:** `applicant-schedule-interview-dialog.tsx`, `applicant-detail-dialog.tsx`, `applicant-detail-interview-section.tsx`, `applicant-tracker.tsx`, `cowork-log.md`

### [2026-05-10] - Dashboard layout: Container + HeaderSection

**Prompt:** create `container.tsx`, `header-section.tsx` and apply to all pages (from jobs header snippet)
**Output:** Added `src/components/layout/container.tsx` (`px-4 py-6 md:px-6` + merge className) and `header-section.tsx` (title, optional description, optional actions). Wired jobs, interviews, settings, screener, candidates pages; refactored `ApplicantTrackerHeader` + `ResumeScreenerHeader` to compose `HeaderSection`. Tracker «เพิ่มผู้สมัคร» now calls `onAddClick` (opens add dialog) instead of unused prop + Link to `/screener`. Dashboard home unchanged (different chrome).
**Edited:** `container.tsx`, `header-section.tsx`, `jobs/page.tsx`, `interviews/page.tsx`, `settings/page.tsx`, `screener/page.tsx`, `candidates/page.tsx`, `applicant-tracker-header.tsx`, `resume-screener-header.tsx`, `cowork-log.md`

### [2026-05-10] - usehooks-ts: debounce, clipboard, isClient

**Prompt:** Implement scoped plan — `useDebounceValue` on candidates search, `useCopyToClipboard` in screener + calendar, `useIsClient` in Kanban overlay; do not edit plan file.
**Output:** `candidates/page.tsx` debounces via `usehooks-ts`; removed `debouncedSearch`/`setDebouncedSearch` from `applicant-tracker-store`. `resume-screener.tsx` + `fullscreen-calendar.tsx` (`SelectedDayEventsPanel`) use `useCopyToClipboard` + boolean success toasts. `kanban.tsx` `KanbanOverlay` gates portal with `useIsClient()` instead of `useSyncExternalStore`.
**Edited:** `applicant-tracker-store.ts`, `candidates/page.tsx`, `resume-screener.tsx`, `fullscreen-calendar.tsx`, `kanban.tsx`, `cowork-log.md`

### [2026-05-10] - Screener report dialog + R2 resume attachments

**Prompt:** Implement plan — screening report as large auto-opening dialog, summary bar, centered input; Cloudflare R2 PDF storage, signed download URLs, tracker detail resume section (collapsible), multipart add-to-tracker with PDF.
**Output:** `screener-dialog-store` adds `reportDialogOpen`. `ScreenerReportPanel` → Dialog max-w-3xl; `ScreenerResultSummary` under centered `ResumeInputCard`. `add-to-tracker` uses `payload` JSON + optional `file`; uploads to R2 after applicant create when configured. `GET/POST/DELETE` `applicants/:id/resume-url` + `resume`. `TrackerApplicant` + list API include `cvText`/`cvFileKey`/`cvFileName`. `ApplicantDetailResumeSection` + `collapsible` UI. Env: `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
**Edited:** `screener-dialog-store.ts`, `screener-report-panel.tsx`, `screener-result-summary.tsx`, `resume-screener.tsx`, `src/lib/r2.ts`, `screener-routes.ts`, `applicant-routes.ts`, `applicant-tracker-model.ts`, `applicant-detail-dialog.tsx`, `applicant-detail-resume-section.tsx`, `collapsible.tsx`, `candidates/page.tsx`, `package.json`/lockfile, `cowork-log.md`

### [2026-05-10] - Screener: two columns + session AI history

**Prompt:** Add AI screen history on right side, move AI form to left side.
**Output:** `lg:grid-cols-2` layout — left: `ResumeInputCard` + `ScreenerResultSummary` (`max-w-2xl`); right: `ScreenerHistoryPanel` (sticky on large screens, scroll list, select to restore report/job, ล้างทั้งหมด). Each successful analyze prepends a `ScreenerHistoryEntry` (in-memory session). `activeHistoryId` tracks selection; form ล้าง / job change / PDF pick clears active highlight when current report cleared.
**Edited:** `screener-history-panel.tsx`, `resume-screener.tsx`, `screener-result-summary.tsx`, `cowork-log.md`

### [2026-05-10] - Screener history: Prisma persistence + cursor pagination

**Prompt:** Make AI screen history persistent with Prisma DB; add pagination.
**Output:** New `ScreenerHistory` model (user FK, job snapshot, detected name/email, `report` JSON, index userId+createdAt). Migration `20260510120000_screener_history`. `POST /screener/evaluate` persists row after success (`historyId` optional if save fails). `GET /screener/history?limit&cursor` (cursor=id, take+1), `DELETE /screener/history` wipe for user. Client: `useInfiniteQuery` + โหลดเพิ่ม; ล้างทั้งหมด calls DELETE + invalidates.
**Edited:** `schema.prisma`, `prisma/migrations/20260510120000_screener_history/migration.sql`, `screener-routes.ts`, `resume-screener.tsx`, `screener-history-panel.tsx`, `cowork-log.md`

### [2026-05-10] - Screener prompt: Thai → English for cost saving

**Prompt:** Change screener-prompts.ts instructions to English but keep output in Thai.
**Output:** Rewrote system prompt and jdPrompt template from Thai to English. Rule #1 still mandates "All output text must be in Thai". Saves token cost since English tokenizes more efficiently than Thai.
**Edited:** `screener-prompts.ts`, `cowork-log.md`

### [2026-05-10 23:23] - Migrate Clerk to Better Auth

**Prompt:** Remove Clerk and migrate to better-auth (Google OAuth only). Tasks: (1) migrate middleware to better-auth with Elysia auth plugin, (2) build sign-in page with shadcn UI.

**Output:**

- Created `src/middleware.ts` with cookie-based session check (public: `/sign-in`, `/api/auth/*`)
- Created `src/lib/auth-client.ts` using `createAuthClient` from better-auth/react
- Created `src/server/lib/auth-plugin.ts` — shared Elysia derive plugin calling `auth.api.getSession()`
- Created `src/app/sign-in/page.tsx` — shadcn Card centered, Google OAuth button
- Migrated all 5 route files (applicant, interview, dashboard, job, screener) from Clerk `auth()` + `ensureUserFromClerkId` to better-auth plugin pattern
- Replaced `src/lib/get-google-token.ts` to read from Prisma `Account` table with token refresh via Google OAuth endpoint
- Fixed `organizerUserId: number` → `string` in `interview-scheduling.ts` to match Prisma schema
- Updated sidebar: replaced Clerk `UserButton` with Avatar + name + sign-out via `authClient.signOut()`
- Removed `ClerkProvider` from `layout.tsx`
- Deleted `src/proxy.ts`, `src/lib/clerk-db-user.ts`, `src/app/sign-in/[[...sign-in]]/`
- Removed `@clerk/nextjs` package and Clerk env vars

**Edited:** src/middleware.ts (new), src/lib/auth-client.ts (new), src/server/lib/auth-plugin.ts (new), src/app/sign-in/page.tsx (new), src/server/routes/applicant-routes.ts, src/server/routes/interview-routes.ts, src/server/routes/dashboard-routes.ts, src/server/routes/job-routes.ts, src/server/routes/screener-routes.ts, src/lib/get-google-token.ts, src/lib/auth.ts, src/server/lib/interview-scheduling.ts, src/features/dashboard/components/app-sidebar.tsx, src/app/layout.tsx, .env

### [2026-05-10 04:18] - Add applicant dialog: React Hook Form

**Prompt:** `/shadcn use react-hook-form`
**Output:** Wired the add applicant dialog to `react-hook-form` with a Zod resolver, shadcn `FieldError` validation states, submit-based manual/AI-confirm saves, and grouped radix `SelectItem` composition while keeping Zustand synced as the tracker source of truth.
**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### [2026-05-10 04:07] - Gmail resume intake brainstorming

**Prompt:** brainstorm idea; pain point: HR need to get resume data and person from Gmail automatically and make it easy to use
**Output:** Proposed Gmail resume intake concepts: watched inbox/label, automatic resume parsing, duplicate detection, review queue, job matching, applicant creation, candidate communication, and a pragmatic MVP path.
**Edited:** `cowork-log.md`

### [2026-05-10 02:12] - Improve screener prompt strictness

**Prompt:** `make screener-prompts.ts more strict and better`
**Output:** Rewrote `jdPrompt` + extracted `SCREENER_SYSTEM_PROMPT` with: explicit scoring rubric (0–10 per range), fitStatus→overallScore mapping rules, per-dimension evaluation criteria (skillFit/experienceFit/cultureFit), evidence-based enforcement (no guessing), field-level constraints (min counts, cite CV), integer-only scores, verbatim name/email extraction. Removed duplicated inline system prompt from `screener-routes.ts` in favor of single export.
**Edited:** `src/features/screener/lib/screener-prompts.ts`, `src/server/routes/screener-routes.ts`, `cowork-log.md`

### [2026-05-10 00:43] - Interviews calendar: add schedule CTA

**Prompt:** `@src/components/ui/fullscreen-calendar.tsx:537-540 implement add schedule logic`
**Output:** ปุ่ม `เพิ่มนัด` ใน `FullScreenCalendar` เรียก `onScheduleForDate(selectedDay)` และ disable เมื่อไม่มี handler/เป็นวันอดีต; หน้า `/interviews` เปิด dialog กำหนดนัดจากวันที่เลือก, เลือกผู้สมัครที่ยังไม่มีนัด, ส่ง `POST /interviews`, invalidate calendar/applicants; schedule dialog รองรับ field แทรกก่อนฟอร์ม + seeded datetime จากวันที่เลือก
**Edited:** `src/components/ui/fullscreen-calendar.tsx`, `src/features/interviews/components/interviews-calendar.tsx`, `src/features/applicants-tracker/components/applicant-schedule-interview-dialog.tsx`, `cowork-log.md`

### [2026-05-09] - Calendar sidebar: reminder, organizer, guests, notes

**Prompt:** add more information — reminder, organizer, x person x yes, notes
**Output:** `GoogleCalendarListEvent` + `Event` gain `remindersLabel`, `organizerEmail`, `attendeeTotal`/`attendeeAccepted`, `notesPlain` (HTML stripped); `sidebarFieldsFromListEvent` in list mapper reuses reminder formatter; sidebar rows with Bell/User/Users/FileText icons + Thai labels (`การแจ้งเตือน`, `ผู้จัด`, `ผู้เข้าร่วม · N คน · ตอบรับ M`, `หมายเหตุ`).
**Edited:** `google-calendar-list-event.ts`, `google-calendar-service.ts`, `google-calendar-feed.ts`, `fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - Calendar sidebar: cancel row always visible

**Prompt:** add cancel button
**Output:** ยกเลิกนัด moved to its own full-width row (border-t) below Meet actions when `onCancelCalendarEvent` is set; disabled after event start with `title` hint instead of hiding.
**Edited:** `fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - Calendar sidebar: Meet links, cancel, strikethrough

**Prompt:** add join meeting link, copy meet link in card; cancel schedule with strikethrough when cancelled
**Output:** `Event.meetLink` from `hangoutLink`; sidebar rows: เข้าประชุม / คัดลอกลิงก์ (sonner), ยกเลิกนัด + AlertDialog; cancelled cards use muted border/bg + existing line-through. `cancelPrimaryCalendarEvent` patches Google `status: cancelled`; `POST /interviews/calendar-events/cancel` syncs matching `Interview` + applicant stage like DELETE; `InterviewsCalendar` `useMutation` + invalidate `interviews-calendar-events`.
**Edited:** `fullscreen-calendar.tsx`, `google-calendar-feed.ts`, `google-calendar-service.ts`, `interview-routes.ts`, `interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - Calendar API: Meet-only filter

**Prompt:** only google meet scheduler event only
**Output:** `listPrimaryCalendarEvents` skips items unless `eventHasGoogleMeet`: `hangoutLink` with `meet.google.com`, or `conferenceSolution` `hangoutsMeet`, or a video entry point URI to Meet.
**Edited:** `google-calendar-service.ts`, `google-calendar-list-event.ts` comment, `cowork-log.md`

### [2026-05-09] - Calendar feed: parseISO crash (Eden Date decode)

**Prompt:** fix bug with nextjs mcp
**Output:** Next devtools log showed `parseISO(row.startIso)` → `dateString.split is not a function` because API values arrived as `Date` on the client. Added `instantFromApi` for `string | Date`; widened `GoogleCalendarListEvent.startIso/endIso`; normalize `datetime` with `toISOString()` for sort keys.
**Edited:** `google-calendar-feed.ts`, `google-calendar-list-event.ts`, `cowork-log.md`

### [2026-05-09] - Interviews: Google Calendar API + cancelled styling

**Prompt:** implement api and display real calendar meet data; incoming vs cancelled (strikethrough)
**Output:** `GET /api/interviews/calendar-events?from=&to=` lists primary calendar via `listPrimaryCalendarEvents` (confirmed/tentative/cancelled). DTO `GoogleCalendarListEvent` in `types/google-calendar-list-event.ts`. Client `InterviewsCalendar` uses TanStack Query + `groupGoogleCalendarEventsToCalendarData`; `FullScreenCalendar` `Event.status`, string `id`, `onVisibleRangeChange` + `useMemo` month anchor, `calendarLoading` opacity; strikethrough / muted for cancelled in sidebar + desktop cells; dot indicators muted for cancelled.
**Edited:** `google-calendar-service.ts`, `interview-routes.ts`, `google-calendar-feed.ts`, `google-calendar-list-event.ts`, `fullscreen-calendar.tsx`, `interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - FullScreen calendar: events in separate Card

**Prompt:** separated to new card (outside calendar card)
**Output:** Root layout `flex-col gap-4 lg:flex-row`: first shadcn `Card` wraps toolbar + grid only; second `Card` wraps `SelectedDayEventsPanel` (panel is `CardHeader`/`CardContent` only, no nested outer Card). `interviews-calendar` drops single bordered wrapper so Chrome is per-Card.
**Edited:** `fullscreen-calendar.tsx`, `interviews-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - FullScreen calendar: selected-day event sidebar

**Prompt:** when click calendar show event list on right (Card pattern example)
**Output:** `getEventsForCalendarDay` merges/sorts by `datetime`. `SelectedDayEventsPanel` uses shadcn `Card` + Thai `format` title (`EEEE d MMMM yyyy`), rows with title + `ClockIcon` + time; empty state + optional `onScheduleForDate`. Layout: `lg:flex-row` with calendar `min-w-0 flex-1` and `aside` `lg:w-80 border-l`; stacked on small screens. Fixed JSX: close left column before `aside` so sidebar is sibling under row.
**Edited:** `src/components/ui/fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - FullScreen calendar: disable past days

**Prompt:** disabled previous day from today
**Output:** `isPastCalendarDay` via `isBefore(day, startOfToday())`. Mobile `<button disabled>`; desktop month cell is `role="button"` with guarded click/keyboard, `aria-disabled`, `tabIndex=-1` when past, muted styles + no hover. Inner day control is a `span` so past cells don’t nest a disabled button.
**Edited:** `src/components/ui/fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - FullScreen calendar date-fns Thai locale

**Prompt:** add locale th to date-fns
**Output:** `fullscreen-calendar.tsx` imports `th` from `date-fns/locale`; localized `format`/`parse` for month navigation and headers; `startOfWeek`/`endOfWeek` with `{ locale: th }`; weekday row derived from first week via `EEE` + `th` instead of hardcoded English.
**Edited:** `src/components/ui/fullscreen-calendar.tsx`, `cowork-log.md`

### [2026-05-09] - FullScreen calendar integration

**Prompt:** Implement plan: add fullscreen month calendar under `src/components/ui`, `useMediaQuery` hook, wire `/interviews` via feature client component; do not replace Button/Separator; 2026 demo data.
**Output:** `src/components/ui/fullscreen-calendar.tsx` (`FullScreenCalendar`, exported `CalendarData`/`Event`). `src/hooks/use-media-query.ts` with `useSyncExternalStore` + `matchMedia` (server snapshot `false`) so static prerender works — `@uidotdev/usehooks` `useMediaQuery` throws on SSR so it was not kept. `src/features/interviews/components/interviews-calendar.tsx` wraps demo events (Jan + May 2026 including May 9). `interviews/page.tsx` stays RSC and imports the client wrapper. No new Radix/shadow deps.
**Edited:** `fullscreen-calendar.tsx`, `use-media-query.ts`, `interviews-calendar.tsx`, `interviews/page.tsx`, `package.json`/`bun.lock` (no extra deps), `cowork-log.md`

### [2026-05-09] - Remove calendar UI, keep interview API + empty page

**Prompt:** Remove calendar UI, keep interview API + empty page (plan).
**Output:** `/interviews` เป็น Server Component เปล่า (หัวข้อ + subtitle). ลบ `InterviewsCalendar`, `interviewer-emails-field`, `interviewer-email-utils`, ทั้ง `src/components/calendar/`, `calendar-store.ts`, `types/calendar-event.ts`, และโฟลเดอร์ลอย `src/calendar/`. `interview-routes`, `google-calendar-service`, `interview-calendar-snapshot` ไม่แตะ.
**Edited:** `src/app/(dashboard)/interviews/page.tsx`, ลบไฟล์/โฟลเดอร์ตามแผน, `cowork-log.md`

### [2026-05-09] - Dead code sweep (calendar trees + unused exports)

**Prompt:** scan all dead code and file and remove
**Output:** ลบโฟลเดอร์ลอย `src/components/calendar/` และ `src/calendar/` (ไม่มี import จากแอป). ตัด `getQueryClient`/`cache` ที่ไม่ถูกใช้, ตัด `getGoogleToken` wrapper, ลบ `description` export จาก `chart-area-interactive`, ทำ `activeInterviewStatuses`/`intervalsOverlap`/`normalizeInterviewerEmailList` เป็น module-private. `/interviews/page.tsx` เป็น Server Component (เอา `use client` ออก).
**Edited:** ลบโฟลเดอร์ปฏิทินตามข้างบน, `get-query-client.ts`, `get-google-token.ts`, `chart-area-interactive.tsx`, `interview-scheduling-lib.ts`, `interviewer-email-lib.ts`, `interviews/page.tsx`, `cowork-log.md`

### [2026-05-09] - Calendar: แสดงเวลา 24 ชม.

**Prompt:** use 24 hours instead of 12
**Output:** `HOURS_24` ใน `calendar-utils` เป็นเลเบล `00:00`–`23:00`; `event-sheet` `formatTime` ใช้ `HH:mm` แทน localized `p`
**Edited:** `calendar-utils.ts`, `event-sheet.tsx`, `cowork-log.md`

### [2026-05-09] - Interviews: สร้างนัดผ่าน `CreateEventDialog`

**Prompt:** สร้างนัดสัมด้วย `create-event-dialog.tsx` — implement missing feature ให้สอดคล้องคอมโพเนนต์นั้น
**Output:** โหมด `variant="interviews"`: เลือกผู้สมัคร, วัน, เวลาเริ่ม–จบ (คิดความยาวนัด ≥15 นาที, ข้ามเที่ยงคืนได้), `InterviewerEmailsField`, โน้ต Calendar → `POST /interviews` ผ่าน `CreateInterviewSubmitPayload`. `/interviews` เอา Sheet ออก ใช้ Dialog เดียวกับปฏิทินทั่วไป; `interviewFormSession` + mount เมื่อ `open` เพื่อ seed ฟอร์มโดยไม่ใช้ `useEffect` setState (ผ่าน eslint `react-hooks/set-state-in-effect`). ปิด dialog ถ้ามี `?applicantId=` จะ `router.replace('/interviews')`.
**Edited:** `create-event-dialog.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### [2026-05-09] - Remove locale system (calendar + dates)

**Prompt:** remove locale system
**Output:** Dropped `CalendarControls` `locale` prop and Thai/English copy switch; interviews use `<CalendarControls />` without `locale`. Removed all `date-fns/locale` `th` usage; dates use default English `format()` patterns. `CalendarHeader` interviews subtitle and primary default label translated to English; interview sheet attendee strings aligned to English where locale-driven.
**Edited:** `calendar-controls.tsx`, `calendar-header.tsx`, `event-sheet.tsx`, `interviews-calendar-client.tsx`, `applicant-tracker-table.tsx`, `tracker-card.tsx`, `applicant-detail-dialog.tsx`, `cowork-log.md`

### [2026-05-09] - Interviews: ลบ `calendar-sidebar`

**Prompt:** remove `src/components/calendar/calendar-sidebar.tsx`
**Output:** ลบไฟล์; `/interviews` ย้าย Google connect / applicant prefill ไปแถบ `border-b` ด้านบนการ์ดปฏิทิน
**Edited:** `interviews-calendar-client.tsx`, ลบ `calendar-sidebar.tsx`, `cowork-log.md`

### [2026-05-09] - Interviews: ใช้ `@/components/calendar` แทน big-calendar

**Prompt:** replace current calendar to `src/components/calendar` (layout ตัวอย่าง Sidebar + Header + Controls + View)
**Output:** `/interviews` ใช้ `CalendarSidebar` + `CalendarHeader`/`CalendarControls`/`CalendarView`; ไม่ซ้อน `SidebarProvider` (dashboard มี `AppSidebar`) เลย `hideSidebarTrigger`. `calendar-store` `customEvents` sync จาก API; query range ผูก `currentWeekStart`. คลิกการ์ด (`interviewId`) เปิด manage เมื่อลิงก์ Google แล้ว. ลบ `interviews-calendar-header.tsx`. แก้ `initialFocus` บน `Calendar`; lucide `Code2` แทน `Github`
**Edited:** `interviews-calendar-client.tsx`, `calendar-sidebar.tsx`, `calendar-header.tsx`, `calendar-controls.tsx`, `calendar-view.tsx`, `calendar-store.ts`, `mock-data/events.ts`, `dashboard-shell.tsx`, `create-event-dialog.tsx`, `schedule-popover.tsx`, ลบ `interviews-calendar-header.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews: อีเมลผู้สัมภาษณ์ — MultipleSelector (creatable)

**Prompt:** use `@/components/ui/multiple-selector` creatable example for email
**Output:** `InterviewerEmailsField` ใช้ `MultipleSelector` แบบควบคุม `value`/`onChange` เป็น `Option[]` ↔ string คั่นด้วย comma เหมือนเดิม; `options` จาก `suggested-emails` (`อีเมล — ชื่อ`); `creatable` สำหรับอีเมลใหม่; `handleOptionsChange` กรองเฉพาะ `isValidInterviewerEmail` + `emailsFromInterviewerField` dedupe; `emptyIndicator` ไทยโหลด/ไม่พบ; `Label` + `inputProps.id` สำหรับ a11y
**Edited:** `src/features/interviews/components/interviewer-emails-field.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews: อีเมลผู้สัมภาษณ์ — shadcn Popover+Command + Badge chip

**Prompt:** use shadcn combobox and chip
**Output:** เอา Base UI `Combobox` ออกจาก `InterviewerEmailsField`; ใช้ pattern **Popover + Button (role=combobox) + Command** แบบ combobox-demo, ค้นหาคุมเอง (`shouldFilter={false}` + `CommandInput` controlled); รายการ = กลุ่มเพิ่มอีเมลใหม่ (อีเมลที่พิมพ์ครบและถูกต้อง) + กลุ่ม suggested-emails; **chip** ใช้สไตล์ `badgeVariants` + ปุ่มลบ (ไม่มี `chip` ใน registry radix-nova). ยัง serialize `value` เป็น string comma
**Edited:** `src/features/interviews/components/interviewer-emails-field.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews: ฟิลด์อีเมลผู้สัมภาษณ์เป็น Combobox (chips)

**Prompt:** use combobox instead of textarea
**Output:** `InterviewerEmailsField` ใช้ Base UI multi `Combobox` + `ComboboxChips`/`ComboboxChip`/`ComboboxChipsInput` จาก `components/ui/combobox.tsx`; รายการ dropdown = อีเมลที่พิมพ์ครบและถูกต้อง (เพิ่มทาง Enter/คลิก) + อีเมลจาก `suggested-emails`; โชว์ชื่อรองใต้อีเมลเมื่อมีจาก API; parent ยังรับ `value`/`onChange` เป็น string คั่นด้วย comma. `interviewer-email-utils`: `INTERVIEWER_EMAIL_RE`, `isValidInterviewerEmail`, `emailsFromInterviewerField`; ลบ `appendEmailToInterviewerField`.
**Edited:** `src/features/interviews/components/interviewer-emails-field.tsx`, `src/features/interviews/lib/interviewer-email-utils.ts`, `cowork-log.md`

### 2026-05-09 - Interviews: auto-suggest อีเมลที่เคยเชิญ

**Prompt:** สามารถทำให้รองรับ auto suggest email ที่เคย invites ได้ไหม
**Output:** `GET /api/interviews/suggested-emails` คืนรายการ `Interviewer` ที่เคยผูกกับนัดที่ `organizerUserId` เป็นผู้ใช้ปัจจุบัน (dedupe อีเมล). UI ปุ่ม **แนะนำจากที่เคยเชิญ** (Popover + cmdk) ค้นชื่อ/อีเมลแล้วแทรกลง textarea ไม่ซ้ำ. ย้าย `parseEmailsFromTextarea` + `appendEmailToInterviewerField` ไป `interviewer-email-utils.ts`; invalidate cache หลังสร้าง/แก้นัด
**Edited:** `src/server/routes/interview-routes.ts`, `src/features/interviews/components/interviewer-emails-field.tsx`, `interviewer-email-utils.ts`, `interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews: interviewer โดยอีเมล (หลายคน)

**Prompt:** Interviewers ใส่เป็น email (รองรับหลายคน)
**Output:** API `POST/PATCH /interviews` รองรับ `interviewerEmails: string[]` — normalize + validate แล้ว `findFirst`/`create` `Interviewer` (อีเมลใหม่ได้) แล้วเชื่อมเหมือนเดิม + Google attendees จากอีเมลเหล่านั้น; ยังรับ `interviewerIds` ได้ถ้าไม่ส่ง emails ฟิลด์นี้ หน้า `/interviews` เปลี่ยน checkbox เป็น textarea (comma/บรรทახ/space/;) + copy ไทย; หลังสร้าง/แก้ invalidate `interviewers` query
**Edited:** `src/server/interviewer-email-lib.ts`, `src/server/routes/interview-routes.ts`, `src/features/interviews/components/interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews: lramos33 big-calendar replaces react-big-calendar

**Prompt:** remove react-big-calendar and use https://github.com/lramos33/big-calendar instead; setup and replace
**Output:** `/interviews` uses `CalendarProvider` + `ClientContainer` (month/week) and Thai `InterviewsCalendarHeader`; interviews mapped to `IEvent`/`IUser`, `eventsSyncKey` syncs server data, drag calls PATCH via `dragRescheduleMut`, event click opens manage dialog, day-number click opens create at 09:00. Context extended: `eventsSyncKey`, `dndEnabled`, `onRemoteEventUpdate`, `onEventActivate`, `onDayCellDateClick`. `IEvent.id` → `string`. Removed `react-big-calendar` and deleted `shadcn-big-calendar` wrapper/CSS. Added `src/hooks/use-disclosure.ts`, `ni react-hook-form @hookform/resolvers`; `SingleCalendar` wraps shadcn `Calendar`; `tsconfig` excludes vendored `big-calendar/`; fixes for Zod 4 `eventSchema`, `avatar-group` cloneElement types, `date-fns` `set` for slot time.
**Edited:** `src/features/interviews/components/interviews-calendar-client.tsx`, `interviews-calendar-header.tsx`, `src/calendar/contexts/calendar-context.tsx`, `interfaces.ts`, `mocks.ts`, `hooks/use-update-event.ts`, `components/client-container.tsx`, dnd + `event-details-dialog` + `day-cell`, `schemas.ts`, `src/components/ui/single-calendar.tsx`, `single-day-picker.tsx`, `avatar-group.tsx`, `calendar/.../calendar-day-view.tsx`, `tsconfig.json`, `package.json` / lockfile, `src/hooks/use-disclosure.ts`, deleted `src/components/shadcn-big-calendar/*`, `cowork-log.md`

### 2026-05-09 - Calendar: email invites to attendees (sendUpdates=all)

**Prompt:** send meeting scheduler to their email too
**Output:** `google-calendar-service.ts`: `sendUpdates: "all"` on `events.insert`, `patch`, `delete` so Google emails calendar invites/updates/cancellations to all guests (applicant + interviewer emails already in `attendeeEmails`). README note under Calendar/Meet.
**Edited:** `src/server/google-calendar/google-calendar-service.ts`, `README.md`, `cowork-log.md`

### 2026-05-09 - Google Calendar OAuth scope: full `calendar` + clearer 403 on insufficient scopes

**Prompt:** insufficient authentication scopes when creating interview / Meet
**Output:** `CALENDAR_EVENTS_SCOPE` value → `https://www.googleapis.com/auth/calendar` (meet + insert edge cases); README consent step updated + revoke/reconnect note. Interview POST: detect insufficient-scope errors from API message → 403 + `GOOGLE_INSUFFICIENT_SCOPES` Thai copy.
**Edited:** `src/server/google-calendar/google-calendar-service.ts`, `src/server/interview-routes.ts`, `README.md`, `cowork-log.md`

### 2026-05-09 - Google OAuth `/start` fix: public API paths + OAuth state env guard

**Prompt:** localhost unable to handle request on `/api/integrations/google/start`
**Output:** `proxy.ts`: mark `/api/integrations/google/start` and `callback` public so `auth.protect` doesn’t interfere (callback must preserve `code`/`state`; start still uses `auth()` → 401 ถ้าไม่ได้ล็อกอิน). `start/route.ts`: try/catch `signGoogleOAuthState` → 500 JSON with Thai hint. Align `GOOGLE_TOKEN_ENCRYPTION_KEY` min length to **32** in `google-oauth-state` (match `google-token-crypto`).
**Edited:** `src/proxy.ts`, `src/app/api/integrations/google/start/route.ts`, `src/lib/google-oauth-state.ts`, `cowork-log.md`

### 2026-05-09 - Google Calendar: modular `@googleapis/calendar` + `google-auth-library`

**Prompt:** Migrate Calendar client off monolithic `googleapis` to `@googleapis/calendar` + `google-auth-library` (plan).
**Output:** `google-calendar-service.ts`: `OAuth2Client` for OAuth + token exchange; `calendar({ version: "v3", auth })` for API calls; renamed local vars to `cal` / `primaryCal` vs factory. Removed `googleapis` dependency (`nun googleapis`). `nr build` OK.
**Edited:** `src/server/google-calendar/google-calendar-service.ts`, `package.json`, `bun.lock`, `cowork-log.md`

### 2026-05-09 - Interviews calendar: Shadcn-themed react-big-calendar

**Prompt:** use shadcn-big-calendar — example list-jonas/shadcn-ui-big-calendar
**Output:** Added `src/components/shadcn-big-calendar/shadcn-big-calendar.css` (upstream MIT theme vars for `.rbc-*`) + `shadcn-big-calendar.tsx` (client default export wrapping `Calendar` + importing CSS only). `/interviews` client drops default `react-big-calendar` CSS import, imports calendar from wrapper. README stack line cites upstream repo.
**Edited:** `src/components/shadcn-big-calendar/shadcn-big-calendar.css`, `src/components/shadcn-big-calendar/shadcn-big-calendar.tsx`, `src/features/interviews/components/interviews-calendar-client.tsx`, `README.md`, `cowork-log.md`

### 2026-05-09 - Interview Scheduler: Google Calendar + Meet + tracker sync

**Prompt:** Implement plan: Calendar-like UI, OAuth per HR user, Google Meet via Calendar API, conflict (DB + FreeBusy organizer), cancel → Applicant PRE_SCREEN_CALL, reschedule → keep FIRST_INTERVIEW; month/week views.
**Output:** Prisma `UserGoogleCalendar`, `Interview.organizerUserId`; libs `google-token-crypto`, `google-oauth-state`, `clerk-db-user`; `google-calendar-service` (insert Meet, patch, delete, freebusy); OAuth Next routes `/api/integrations/google/start|callback`; Elysia `integrations/google/status`, `interviewers` list, `/interviews` CRUD + description from `ScreeningResult`; swapped FullCalendar→`react-big-calendar` (no CSS bundles in `@fullcalendar` v6 pkgs); UI `/interviews` Thai copy, dialogs, `?applicantId=` prefill banner. README env + flows.
**Edited:** `prisma/schema.prisma`, `src/server/**`, `src/app/api/integrations/google/**`, `src/features/interviews/**`, `src/app/(dashboard)/interviews/page.tsx`, `README.md`, `cowork-log.md`

### 2026-05-09 - Jobs table: no column sort, stable row order on status toggle

**Prompt:** remove sort and dont reorder when toggle status
**Output:** Dropped TanStack sort UI/state (`getSortedRowModel`, header sort buttons); plain headers + `enableSorting: false` table-wide. GET `/jobs` list `orderBy` changed from `updatedAt` to `createdAt` desc so PATCH `isActive` (bumps `updatedAt`) no longer jumps the row after refetch.
**Edited:** `src/features/jobs/components/jobs-table.tsx`, `src/server/job-routes.ts`, `cowork-log.md`

### 2026-05-09 - Applicant tracker header: Tabs for view switch

**Prompt:** applicant-tracker-header ToggleGroup → use tabs
**Output:** Replaced `ToggleGroup`/`ToggleGroupItem` with `Tabs`/`TabsList`/`TabsTrigger` from `@/components/ui/tabs`; controlled `value={view}` + `onViewChange` guard for board/table; kept border + trigger spacing/icons.
**Edited:** `src/features/applicants-tracker/components/applicant-tracker-header.tsx`, `cowork-log.md`

### [2026-05-09] - Screener: tracker draft name/email from analyze

**Prompt:** fix candidate name and email don't set to dialog
**Output:** Moved draft name/email off Zustand into `ResumeScreener` state (`trackerDraftName`/`trackerDraftEmail`); opening runs `openTrackerDraft()` that copies trimmed `detectedName`/`detectedEmail` then `setTrackerDialogOpen(true)`. Zustand store only tracks `trackerDialogOpen` + JD dialog. `AddToTrackerDialog` is fully controlled via props (no stale subscription vs Radix open lifecycle).

### 2026-05-09 - Screener feature split + Zustand dialogs

**Prompt:** split component to feature based; use zustand for dialog
**Output:** Split `resume-screener.tsx` into `resume-screener-header`, `job-description-dialog` (open button + `useQuery` for JD when dialog open), `add-to-tracker-dialog`, `resume-input-card`, `screener-report-panel`, `fit-row`, `report-bullet-block`; helpers/types in `lib/resume-screener-utils.ts`; `store/screener-dialog-store.ts` holds `jdDialogOpen`, tracker open + name/email + `openTrackerDialog`. `ResumeScreener` composes pieces and keeps jobs/evaluate/add mutations.
**Edited:** `src/features/screener/**`, `cowork-log.md`

### 2026-05-09 - Kanban board pattern (Card + overlay)

**Prompt:** change kanban style to match reui task board pattern (Card columns, Badge count, Grip column handle, full-card item handle, dashed overlay).
**Output:** `ApplicantKanbanStageColumn`: `Card`/`CardHeader`/`CardContent` per stage, `Badge` จำนวน, `KanbanColumnHandle` + ghost `Button` + `GripVerticalIcon`; responsive `KanbanBoard` grid. `TrackerCard`: `Card`/`CardContent` แถวชื่อ+คะแนน, รายละเอียดด้วยปุ่ม `ChevronRight` (`stopPropagation`); `KanbanItemHandle` ห่อการ์ดเมื่อลาก; `asHandle`/`isOverlay` สำหรับ overlay. `KanbanOverlay` ฟังก์ชัน children แสดงคอลัมน์/การ์ดจริง พร้อม `border-dashed bg-muted/10`.
**Edited:** `src/features/applicants-tracker/components/applicant-kanban-board-view.tsx`, `tracker-card.tsx`, `cowork-log.md`

### 2026-05-09 - Kanban tracker card layout

**Prompt:** add kanban card, here's layout i need (reference: avatar left, name+role, score top-right, source+date row, tags pills)
**Output:** `TrackerCard`: แถวบน `Avatar` size lg สีพื้นหลัง `#FFCC00` + อักษรย่อ, ชื่อหนา + ตำแหน่งรอง, Badge คะแนน + ปุ่มเปิด; แถวกลาง `Tag` + แหล่งที่มา / `Clock` + วันที่ (`EEE, d MMM` locale th); แถวล่าง pill `row.tags` (`rounded-full bg-muted`) เมื่อมีแท็ก
**Edited:** `src/features/applicants-tracker/components/tracker-card.tsx`, `cowork-log.md`

### 2026-05-09 - Jobs CRUD table (JD + สถานะ)

**Prompt:** CRUD Jobs (Table) - job description - toggle status (switch) using shadcn table
**Output:** เพิ่ม `jobRoutes` (`GET/POST /api/jobs`, `PATCH/DELETE /api/jobs/:id`) พร้อม auth แบบ Clerk, ลบ JD ได้เมื่อไม่มีผู้สมัคร (409 ถ้ามี). UI: `JobsPageClient` + TanStack Table (`JobsTable`) คอลัมน์ชื่อ/รายละเอียดงาน/จำนวนผู้สมัคร/Switch รับสมัคร/แก้ไข-ลบ; `JobFormDialog` สร้าง-แก้ title+description+requirements+Switch; invalidate `jobs-admin` และ `screener-jobs` หลัง mutation.
**Edited:** `src/server/job-routes.ts`, `src/server/elysia-app.ts`, `src/features/jobs/lib/job-description-schema.ts`, `src/features/jobs/components/jobs-table.tsx`, `job-form-dialog.tsx`, `jobs-page-client.tsx`, `src/app/(dashboard)/jobs/page.tsx`, `cowork-log.md`

### 2026-05-09 - Interviews header + create sheet

**Prompt:** (1) ย้ายปุ่มเชื่อมบัญชีไปข้างปุ่มสร้างนัด (2) สร้างนัดใช้ shadcn Sheet
**Output:** `CalendarHeader` รับ `interviewsBeforePrimary` แสดง Badge เชื่อมแล้วหรือปุ่มเชื่อม Google ก่อนปุ่มสร้างนัด; ลบแถบซ้ำด้านบน (เหลือแถบ applicant prefill เมื่อมี query). ฟอร์มสร้างนัดจาก `Dialog` → `Sheet` slide จากขวา พร้อม footer ปิด/สร้าง.
**Edited:** `src/components/calendar/calendar-header.tsx`, `src/features/interviews/components/interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Interview EventSheet + GET detail

**Prompt:** Plan: card → EventSheet (`mode=interview`), `GET /interviews/:id`, ลบ bloc ผู้ร่วมสัมภาษณ์ใน event-sheet
**Output:** `event-sheet` interview mode ตัดรายชื่อผู้ร่วม เหลือ header + Meet + `children`. `/interviews` ใช้ `CalendarView` + `eventSheetMode="interview"` + `InterviewEventSheetBody` (`useQuery` detail) + `InterviewEventSheetForm` (patch/delete, `key`=`id+updatedAt` หลีก setState ใน effect); ลบ manage `Dialog` และ prop ที่ไม่มีใน `CalendarView`
**Edited:** `src/components/calendar/event-sheet.tsx`, `src/features/interviews/components/interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Interview EventSheet classic UI

**Prompt:** keep old event-sheet ui — propose new time, info, attendee list
**Output:** `InterviewEventSheetContent` คืนแถบเครื่องมือ (Pen/FileText/Layers/Trash2), ปุ่ม Propose new time (scroll ไป `#interview-sheet-reschedule`), รายชื่อ Guests จาก `event.participants`, Google Meet, บล็อก info (reminder/organizer/phone/users/notes) + ข้อความ notes แบบ default; `EventSheet`/`CalendarView` รับ `interviewRescheduleSectionId`; body ห่อฟอร์มแก้ไขด้วย id นั้น
**Edited:** `src/components/calendar/event-sheet.tsx`, `src/components/calendar/calendar-view.tsx`, `src/features/interviews/components/interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Interview sheet toolbar dialogs

**Prompt:** ยกเลิกนัด → ไอคอนลบด้านบน; แก้ไข → ไอคอนแก้ไข; กดแล้วเป็น dialog
**Output:** Export `InterviewEventSheetToolbarHandlers`; `CalendarView` เก็บ state + setter จาก `renderEventSheetChildren` Parm ที่ 3; `EventSheet` ส่ง `interviewToolbar` — Pen/FileText/Layers + Propose new time → `onEdit`, Trash → `onDelete`. ฟอร์มอยู่ใน `Dialog`; ยกเลิกนัดอยู่ใน `AlertDialog` แบบ controlled + ปุ่ม destructive ธรรมดา (`cancelMut`). ตัด `#interview-sheet-reschedule` / `interviewRescheduleSectionId`
**Edited:** `event-sheet.tsx`, `calendar-view.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - Event sheet metadata from Google Calendar API

**Prompt:** `@event-sheet.tsx:343-378` implement real API (Google Calendar or etc.)
**Output:** เพิ่ม `fetchPrimaryCalendarEvent` + `snapshotFromGoogleCalendarEvent` แมป reminders / organizer.email / เบอร์ dial-in (`conferenceData` phone entryPoints) / นับ RSVP จาก attendees / description จาก `events.get`. `GET /interviews/:id` คืน `calendarSnapshot` เมื่อมี `googleEventId` + เชื่อม Google; include `organizer.email` ใน list+detail; `InterviewEventSheetContent` ใช้ `useQuery` คีย์เดียวกับฟอร์มแก้ไข แสดงข้อความจริง และ merge โน้ต DB+Google แทน placeholder; เติม `Event`/`interviewToCalendarEvent` (`organizerEmail`, `googleEventId`, `description`, รวมอีเมลผู้สมัครเป็น guest)
**Edited:** `google-calendar-service.ts`, `interview-routes.ts`, `src/types/interview-calendar-snapshot.ts`, `event-sheet.tsx`, `interviews-calendar-client.tsx`, `mock-data/events.ts`, `cowork-log.md`

### 2026-05-09 - ปฏิทินแสดงนัดที่ยกเลิก

**Prompt:** ตอนยกเลิกนัดให้เก็บ data อยู่แต่ขึ้นสถานะใน event-card ว่ายกเลิก  
**Output:** เอา filter `status !== CANCELLED` ออกจาก `GET /interviews` เพื่อดึงแถวที่ยกเลิกมาแสดง; เพิ่ม `interviewStatus` + `CalendarInterviewStatus` ใน `CalendarEvent`; `interviewToCalendarEvent` ส่ง `status` และ prefix ชื่อ `(ยกเลิก)`; `EventCard` — border เส้นประ muted, จุดสีเทา, title line-through, Badge/label ยกเลิก, ซ่อนลิงก์ Meet เมื่อยกเลิก; `InterviewEventSheetContent` — banner อธิบาย + `canUseToolbar` false เมื่อ cancelled; toolbar ไม่ register จนกว่า row โหลดและไม่ใช่ CANCELLED  
**Edited:** `interview-routes.ts`, `calendar-event.ts`, `event-card.tsx`, `event-sheet.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-09 - ลบ mock ปฏิทิน

**Prompt:** remove calendar mock data
**Output:** ลบ `src/mock-data/events.ts`; ประเภทเหตุการณ์อยู่ที่ `types/calendar-event.ts` (`CalendarEvent`). Zustand ใช้ `calendarEvents: []` + `setCalendarEvents` แทน `customEvents|null` และ demo-week template; เพิ่ม event จาก Create dialog เขียนลง store ด้วย `crypto.randomUUID()`. `/interviews` sync จาก API และ unmount เคลียร์เป็น `[]`. Header โชว์ "วันนี้" จาก store อย่างเดียว
**Edited:** `calendar-store.ts`, `calendar-view.tsx`, `calendar-day-column.tsx`, `calendar-header.tsx`, `event-card.tsx`, `event-sheet.tsx`, `create-event-dialog.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`; ลบ `mock-data/events.ts`

### [2026-05-09] - Interview status: ReUI Badge แทน prefix ในชื่อ

**Prompt:** status prefix use reui badge  
**Output:** ลบ prefix ข้อความ `[ยกเลิก]`/`[เลื่อน]` ออกจาก `title` ใน `interviewToCalendarEvent`; เพิ่ม `CalendarInterviewStatusBadge` (`@/components/reui/badge`, `destructive-light`/`warning-light`, pill) ใน `event-card` และหัว `event-sheet` (interview + default mode)  
**Edited:** `calendar-interview-status-badge.tsx`, `event-card.tsx`, `event-sheet.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### [2026-05-09] - สร้างนัด: Alert เมื่อนัดทับในระบบ

**Prompt:** ถ้าขึ้นว่ามีนัดทับในระบบ แจ้งด้วย shadcn `alert.tsx` ใน `create-event-dialog.tsx`
**Output:** โหมดสัมภาษณ์แสดง `Alert` destructive + `AlertTriangle` เมื่อข้อความ error จาก API มี `"นัดที่ทับ"` (ตรงกับ `DB_CONFLICT` ใน `interview-routes`); ส่ง `interviewDbOverlapMessage` จาก `createMut`; ไม่ toast ซ้ำสำหรับเคสนี้; ปิด dialog / เปลี่ยนวันเวลาผู้สมัคร → `reset()` mutation
**Edited:** `create-event-dialog.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### [2026-05-09] - Google Calendar: Clerk OAuth access token

**Prompt:** use `getGoogleToken` / `clerkClient.users.getUserOauthAccessToken` instead of stored refresh token
**Output:** `src/lib/get-google-token.ts`: `getGoogleToken`, `getGoogleTokenForUserId`, `clerkGoogleLinkStatus` (provider `oauth_google`). Interview routes + Calendar API ใช้ access token ต่อคำขอ; `google-calendar-service` ใช้ `OAuth2Client` + `access_token` เท่านั้น (ไม่ต้อง `GOOGLE_CLIENT_*`). ลบ `/api/integrations/google/start|callback`, `google-oauth-state`, `google-token-crypto`; `/integrations/google/status` อิง Clerk `externalAccounts`. UI `/interviews` ปุ่มเชื่อมไป `/settings` + `ClerkAccountSettings` (`UserProfile` hash) บนหน้าตั้งค่า; `README` อัปเดต; `proxy.ts` เอา public OAuth routes ออก; `interviews/page` ห่อ `Suspense` ให้ build ผ่าน
**Edited:** `get-google-token.ts`, `google-calendar-service.ts`, `interview-routes.ts`, `interviews-calendar.tsx`, `settings/page.tsx`, `clerk-account-settings.tsx`, `interviews/page.tsx`, `proxy.ts`, `README.md`, `cowork-log.md`; ลบ `google/start`, `google/callback`, `google-oauth-state.ts`, `google-token-crypto.ts`

### [2026-05-09] - ลบ flow เชื่อม Google แยก (ใช้ token ตอน sign-in)

**Prompt:** ลบการเชื่อมบัญชี Google — sign-in ได้ permission แล้ว เรียก Calendar ผ่าน `get-google-token.ts`
**Output:** ลบ `clerkGoogleLinkStatus`, `/api/integrations/google/status`, `integrationsGoogleRoutes`; `NO_GOOGLE_OAUTH_TOKEN` + ข้อ 403 เมื่อไม่มี token; หน้า `/interviews` ไม่ query status / ไม่ปิดการสร้างนัด — ลบปุ่มเชื่อม Badge คำใบ้; `CreateEventDialog` ไม่รับ `googleLinked`; ลบ `ClerkAccountSettings` + คืนหน้า settings เรียบ; README ลบ status route + flow เชื่อมใน settings
**Edited:** `get-google-token.ts`, `interview-routes.ts`, `elysia-app.ts`, `interviews-calendar.tsx`, `create-event-dialog.tsx`, `settings/page.tsx`, `README.md`, ลบ `clerk-account-settings.tsx`, `cowork-log.md`

### [2026-05-09 12:00] - แปล UI ปฏิทินและแทร็กเกอร์เป็นไทย

**Prompt:** translate component to thai (frontend)
**Output:** Hardcode ข้อความ UI เป็นภาษาไทยใน `calendar-header`, `calendar-controls`, `create-event-dialog`, `event-sheet`, `schedule-popover`; ใช้ `date-fns` `th` locale สำหรับชื่อเดือน/วัน (`PPP`, หัวสัปดาห์ปฏิทิน, เวลาแบบ localized `p`). แก้ `applicant-detail-dialog`, `applicant-tracker-table`, `tracker-card` ให้ `format` วันที่ด้วย `th`. ปรับข้อความเล็กน้อยใน `interviews-calendar-client` (prefill bar).
**Edited:** `calendar-header.tsx`, `calendar-controls.tsx`, `create-event-dialog.tsx`, `event-sheet.tsx`, `schedule-popover.tsx`, `applicant-detail-dialog.tsx`, `applicant-tracker-table.tsx`, `tracker-card.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

### 2026-05-08 - Applicant tracker feature split

**Prompt:** separate component to feature (feature based architecture)
**Output:** Split monolithic `applicant-tracker.tsx` under `features/applicants-tracker/components/`: `tracker-card`, `stage-select`, `applicant-kanban-board-view`, `applicant-tracker-table`, `applicant-tracker-header`, `applicant-tracker-filters`, `add-applicant-dialog`, `applicant-detail-dialog`, `detail-row`, `applicant-detail-ai-scores`, `applicant-detail-notes-section`, `delete-applicant-alert`; pure helpers in `lib/tracker-display-helpers.ts`. `ApplicantTracker` keeps queries/mutations and composes children. Exported `ApplicantTrackerView` from store. `createMut` reads form via `useApplicantTrackerStore.getState()` so submit uses latest fields.
**Edited:** `src/features/applicants-tracker/components/**`, `src/features/applicants-tracker/lib/tracker-display-helpers.ts`, `src/features/applicants-tracker/store/applicant-tracker-store.ts`, `cowork-log.md`

### 2026-05-08 - Applicant HR notes in detail dialog

**Prompt:** have note section below and can update it inside
**Output:** Added `Applicant.notes` (optional), migration `20260509130000_applicant_notes`. Extended `PATCH /applicants/:id` with optional `notes` (or `stage`, at least one required); list/create responses include `notes`; search matches note text. Tracker: unified `patchApplicantMut`, `ApplicantDetailNotesSection` (textarea + บันทึกหมายเหตุ) under AI scores in detail dialog.
**Edited:** `prisma/schema.prisma`, `prisma/migrations/20260509130000_applicant_notes/migration.sql`, `src/server/applicant-routes.ts`, `src/features/applicants-tracker/lib/applicant-tracker-model.ts`, `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-08 - (impeccable polish) Tracker kanban card

**Prompt:** /impeccable polish: track card
**Output:** `TrackerCard`: dedicated drag strip with `GripVerticalIcon` + `KanbanItemHandle` (listeners only on grip); main body is `<button>` calling `onOpen` (detail dialog now reachable from board). `role="group"` + `tabIndex={-1}` on `KanbanItem` so focus goes to the open button, not nested `role="button"`. Removed `shadow-sm`; `rounded-xl` aligned to columns; border/hover/focus-within ring via tokens; `motion-safe` transitions with ease-out curve; avatar uses `secondary` tokens; long text `title` tooltips; fallback copy for missing position; meta row `min-h-9` for touch.
**Edited:** `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-08 - Applicant Tracker (Kanban + table)

**Prompt:** Implement applicant tracker with ReUI Kanban + shadcn table, board/list views.
**Output:** Added Elysia `/api/applicants` (list with search/job/source, POST, PATCH stage, DELETE) with Clerk auth; scores/tags from `ScreeningResult`. Wired `applicantRoutes` in `elysia-app`. UI: `ApplicantTracker` on `/candidates`, toggles บอร์ด/ตาราง, filters, add dialog, detail dialog + delete, debounced drag→PATCH. Kanban uses `@/components/reui/kanban` ([ReUI](https://reui.io/docs/components/base/kanban)). Uses app-level `eden.Provider` from `QueryProvider` (no extra root). Fixed lint/build issues in `kanban` overlay (`useSyncExternalStore`), `query-provider` var name, `calendar` table class typing, `eden.ts` client options cast.
**Edited:** `src/server/applicant-routes.ts`, `src/server/elysia-app.ts`, `src/features/applicants-tracker/**`, `src/app/(dashboard)/candidates/page.tsx`, `src/components/reui/kanban.tsx`, `src/components/ui/calendar.tsx`, `src/components/query-provider.tsx`, `src/lib/eden.ts`

### 2026-05-08 - Polish screener empty AI fields + jobs error

**Prompt:** (impeccable polish) handling empty result.
**Output:** `trimItems` + `ReportBulletBlock` for empty strengths/concerns; numbered questions + panel fallback copy; `FitRow` and copy-to-clipboard handle blank strings; safe overall score display; jobs `isError` alert and empty-JD hint under select; questions block uses design tokens for border/bg (no raw yellow).
**Edited:** `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener report card loading state

**Prompt:** (impeccable polish) On analyze, replace previous result with spinner/loading.
**Output:** Right card shows centered loader + Thai copy when `evaluateMutation.isPending`; `aria-busy`, `role="status"`, `min-h` to reduce layout jump; empty vs results unchanged when not loading.
**Edited:** `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener: name/email in Tracker dialog + AI detect

**Prompt:** Move name/email to add-to-tracker; auto-detect from analyze and prefill dialog.
**Output:** Extended AI output with `screeningEvaluateSchema` (`detectedName`, `detectedEmail`); evaluate returns them; removed name/email from evaluate body. `jdPrompt` + system line instruct CV-only extraction. Client: card "Resume และตำแหน่ง" without contact fields; report header shows detected name/email; Add to Tracker opens dialog prefilled from analyze; submit validates then `add-to-tracker`.
**Edited:** `src/features/screener/lib/fit-report-schemas.ts`, `src/features/screener/lib/screener-prompts.ts`, `src/server/screener-routes.ts`, `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Remove screener auto-match (token cost)

**Prompt:** Remove auto match with all job descriptions to reduce token cost.
**Output:** Deleted server branch that loaded every JD + `autoMatchPrompt` / `buildAutoMatchSchema`; `evaluate` now requires `jobDescriptionId`. Removed `buildAutoMatchSchema`, `autoMatchPrompt` and auto Select option; client uses `selectedJobId` (defaults to first job). Removed auto-match result banner.
**Edited:** `src/server/screener-routes.ts`, `src/features/screener/lib/fit-report-schemas.ts`, `src/features/screener/lib/screener-prompts.ts`, `src/features/screener/components/resume-screener.tsx`, `cowork-log.md`

### 2026-05-08 - Screener: PDF → multipart evaluate, clear/disable textarea

**Prompt:** PDF upload clears/disables textarea; submit file via Eden multipart; AI SDK file in `generateText`; remove parse-pdf/unpdf.
**Output:** Replaced `/analyze`+`/parse-pdf` with single `POST /screener/evaluate` (multipart: optional `file`, `cvText`, `jobDescriptionId`, `name`/`email`). Gemini `generateText` + `Output.object` with PDF as `content: [{ type: 'file', data: Buffer, mediaType, filename }, text]` for JD-specific and auto-match flows; `buildAutoMatchSchema` when no JD id. Client: `evaluate` mutation, `selectedFile` clears text + disables textarea, ลบไฟล์ restores text mode; `__auto__` job select; tracker uses `matchedJobId` from response; auto-match banner. Removed `unpdf`.
**Edited:** `src/server/screener-routes.ts`, `src/features/screener/components/resume-screener.tsx`, `package.json`, `bun.lock`, `cowork-log.md`

**Prompt:** Remove hardcoded sample data (napat/ploy/somchai) from resume screener frontend. Backend already has real logic.
**Output:** Stripped `sampleResumeMap`/`SampleResumeKey` import, `cn` import, `sampleKey` state, `onPickSample` callback, sample buttons JSX block, `setSampleKey` from `onClear`. Cleared initial `name`/`email`/`resumeText` state to empty strings. Added missing `lucide-react` icon imports and `sonner` toast import.
**Edited:** `src/features/screener/components/resume-screener.tsx`

### 2026-05-08 - AI Resume Screener (Gemini + Elysia + Eden)

**Prompt:** Implement AI Resume Screener plan: candidate input + fit report, JD from DB, PDF text extraction, extend ScreeningResult, Add to Tracker → Applicant SCREENING, Clerk, Eden + react-query.
**Output:** Extended `ScreeningResult` with `overallScore`, `fitStatus`, `panelSummary`, `concerns` (+ defaults); `prisma generate`. Added `src/server/screener-routes.ts` (`/api/screener/jobs`, `jobs/:id`, `analyze` via `generateObject` + Gemini `gemini-2.0-flash`, `parse-pdf` via `unpdf`, `add-to-tracker` Prisma create). Wired `screenerRoutes` in `elysia-app.ts`. Installed `@elysiajs/eden`, `@ap0nia/eden-react-query`, `unpdf`. Client: `src/lib/eden.ts`, `ScreenerRoot` + `ResumeScreener` (Thai UI, samples, JD dialog, yellow CTAs). DB drift prevented `migrate dev`/`db push` safely; applied schema in repo only.
**Edited:** `prisma/schema.prisma`, `src/server/elysia-app.ts`, `src/server/screener-routes.ts`, `src/features/screener/**`, `src/lib/eden.ts`, `src/app/(dashboard)/screener/page.tsx`, `package.json`, `bun.lock`, `cowork-log.md`

### 2026-05-08 - dashboard-01 (shadcn block)

**Prompt:** use dashboard-01 https://ui.shadcn.com/blocks#dashboard-01
**Output:** Ran `shadcn add dashboard-01` (components + deps). Wired block layout into `(dashboard)`: `DashboardShell` matches block (`SidebarProvider` CSS vars, `AppSidebar` `variant="inset"`, `SiteHeader` + `DashboardBreadcrumb`), home `page.tsx` = `SectionCards` + `ChartAreaInteractive` + `DataTable` + `data.json` co-located. Removed duplicate `/app/dashboard` route and unused block-only `nav-*` + `components/app-sidebar`. Localized KPI/chart chrome to Thai; `chart-area-interactive` uses `activeRange` instead of `useEffect` for mobile band; `useIsMobile` refactored to `useSyncExternalStore` for lint/React 19 hooks rule.
**Edited:** `(dashboard)/page.tsx`, `(dashboard)/data.json`, `(dashboard)/candidates|jobs|interviews|settings/page.tsx`, `dashboard-shell.tsx`, `app-sidebar.tsx`, `site-header.tsx`, `section-cards.tsx`, `chart-area-interactive.tsx`, `hooks/use-mobile.ts`; deleted `app/dashboard`, `components/app-sidebar.tsx`, `nav-*.tsx`, `cowork-log.md`

### 2026-05-08 - Dashboard sidebar + breadcrumb

**Prompt:** implement shadcn sidebar and navbar breadcrumb for dashboard on every page
**Output:** Added `DashboardShell` (SidebarProvider, AppSidebar, SidebarInset header with SidebarTrigger + `DashboardBreadcrumb`), `AppSidebar` (Thai nav: ภาพรวม, ผู้สมัคร, ตำแหน่งงาน, สัมภาษณ์, ตั้งค่า; Clerk UserButton footer; `collapsible="icon"`), path-based `DashboardBreadcrumb` with Thai segment map + dynamic "รายละเอียด", shared `route-labels.ts`. Wired `(dashboard)/layout.tsx`; stub pages for candidates/jobs/interviews/settings; minimal copy on home.
**Edited:** `src/features/dashboard/components/dashboard-shell.tsx`, `app-sidebar.tsx`, `dashboard-breadcrumb.tsx`, `src/features/dashboard/lib/route-labels.ts`, `src/app/(dashboard)/layout.tsx`, `page.tsx`, `candidates/page.tsx`, `jobs/page.tsx`, `interviews/page.tsx`, `settings/page.tsx`, `cowork-log.md`

### 2026-05-08 - Prisma Interviewer model

**Prompt:** add interviewer model
**Output:** Added `Interviewer` (`id`, optional `userId` → `User`, `name`, unique `email`, `title`, `isActive`, timestamps); `User.interviewer` optional 1:1; implicit M:N `Interview.interviewers` ↔ `Interviewer.interviews`. Schema validated + `prisma generate`.
**Edited:** `prisma/schema.prisma`, `cowork-log.md`

### 2026-05-08 - Setup TanStack Query

**Prompt:** setup tanstack query
**Output:** Added `src/lib/get-query-client.ts` (createQueryClient + `getQueryClient` via React `cache` for RSC), `src/components/query-provider.tsx` with QueryClientProvider, dev-only dynamic ReactQueryDevtools, wrapped app in `layout.tsx`; installed `@tanstack/react-query-devtools`.
**Edited:** `src/lib/get-query-client.ts`, `src/components/query-provider.tsx`, `src/app/layout.tsx`, `package.json`, lockfile

### 2026-05-08 - Setup ElysiaJS for Next.js (Context7)

**Prompt:** setup elysiajs for nextjs use ctx7
**Output:** Context7 docs from `/elysiajs/documentation` (Next.js integration: `app/api/[[...slugs]]/route.ts`, export `app.fetch` per method). Installed `elysia`, added `src/server/elysia-app.ts` (`prefix: '/api'`, sample `/` and `/health`), catch-all route forwarding GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD to `elysiaApp.fetch`. Exported `App` type for future Eden. `nr build` compiles app; typecheck still fails on existing `prisma.config.ts` (`prisma/config`).
**Edited:** `src/server/elysia-app.ts`, `src/app/api/[[...slugs]]/route.ts`, `package.json`, lockfile, `cowork-log.md`

### 2026-05-08 - Applicant detail AI score card

**Prompt:** applicant detail dialog show ai score below pipeline
**Output:** Extended `/api/applicants` list/create/patch to return `skillFit`, `experienceFit`, `cultureFit` with `overallScore`/`tags` via `applicantListFields()`. Updated `TrackerApplicant` and optimistic temp rows. Added `ApplicantDetailAiScores` (cream card, SVG ring for overall/10, breakdown ทักษะ/ประสบการณ์/วัฒนธรรม) under pipeline buttons in detail dialog; hidden when no screening data.
**Edited:** `src/server/applicant-routes.ts`, `src/features/applicants-tracker/lib/applicant-tracker-model.ts`, `src/features/applicants-tracker/components/applicant-tracker.tsx`, `cowork-log.md`

### 2026-05-12 - Add applicant Sheet + Select

**Prompt:** cant select user in add-applicant-dialog
**Output:** Radix `Select` portals outside `Sheet` (Dialog), so dropdown clicks were treated as outside the sheet (closes / blocks selection). Added `onInteractOutside` guard for `[data-slot="select-content"]` on `SheetContent` and `className="z-100"` on both job `SelectContent` instances so the list stays above the sheet overlay.
**Edited:** `src/features/applicants-tracker/components/add-applicant-dialog.tsx`, `cowork-log.md`

### 2026-05-08 - R2 + AWS S3 SDK

**Prompt:** setup r2 with s3 sdk (.env R2\_\* vars)
**Output:** Installed `@aws-sdk/client-s3`. Added `src/lib/r2-s3.ts`: `getR2S3Client()` (endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `getR2BucketName()`, `getR2PublicBaseUrl()`, `getR2PublicObjectUrl(key)` for public R2.dev/custom URLs.
**Edited:** `src/lib/r2-s3.ts`, `package.json`, `bun.lock`, `cowork-log.md`
