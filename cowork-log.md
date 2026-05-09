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

### [2026-05-09 12:00] - แปล UI ปฏิทินและแทร็กเกอร์เป็นไทย
**Prompt:** translate component to thai (frontend)
**Output:** Hardcode ข้อความ UI เป็นภาษาไทยใน `calendar-header`, `calendar-controls`, `create-event-dialog`, `event-sheet`, `schedule-popover`; ใช้ `date-fns` `th` locale สำหรับชื่อเดือน/วัน (`PPP`, หัวสัปดาห์ปฏิทิน, เวลาแบบ localized `p`). แก้ `applicant-detail-dialog`, `applicant-tracker-table`, `tracker-card` ให้ `format` วันที่ด้วย `th`. ปรับข้อความเล็กน้อยใน `interviews-calendar-client` (prefill bar).
**Edited:** `calendar-header.tsx`, `calendar-controls.tsx`, `create-event-dialog.tsx`, `event-sheet.tsx`, `schedule-popover.tsx`, `applicant-detail-dialog.tsx`, `applicant-tracker-table.tsx`, `tracker-card.tsx`, `interviews-calendar-client.tsx`, `cowork-log.md`

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

**Prompt:** fix candidate name and email don't set to dialog
**Output:** Moved draft name/email off Zustand into `ResumeScreener` state (`trackerDraftName`/`trackerDraftEmail`); opening runs `openTrackerDraft()` that copies trimmed `detectedName`/`detectedEmail` then `setTrackerDialogOpen(true)`. Zustand store only tracks `trackerDialogOpen` + JD dialog. `AddToTrackerDialog` is fully controlled via props (no stale subscription vs Radix open lifecycle).

### 2026-05-09 - Screener feature split + Zustand dialogs
**Prompt:** split component to feature based; use zustand for dialog
**Output:** Split `resume-screener.tsx` into `resume-screener-header`, `job-description-dialog` (open button + `useQuery` for JD when dialog open), `add-to-tracker-dialog`, `resume-input-card`, `screener-report-panel`, `fit-row`, `report-bullet-block`; helpers/types in `lib/resume-screener-utils.ts`; `store/screener-dialog-store.ts` holds `jdDialogOpen`, tracker open + name/email + `openTrackerDialog`. `ResumeScreener` composes pieces and keeps jobs/evaluate/add mutations.
**Edited:** `src/features/screener/**`, `cowork-log.md`

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

### 2026-05-08 - R2 + AWS S3 SDK
**Prompt:** setup r2 with s3 sdk (.env R2_* vars)
**Output:** Installed `@aws-sdk/client-s3`. Added `src/lib/r2-s3.ts`: `getR2S3Client()` (endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`), `getR2BucketName()`, `getR2PublicBaseUrl()`, `getR2PublicObjectUrl(key)` for public R2.dev/custom URLs.
**Edited:** `src/lib/r2-s3.ts`, `package.json`, `bun.lock`, `cowork-log.md`

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

### [2026-05-10] - Applicant detail: กำหนดนัด + Meet card
**Prompt:** Applicant Interview CTA Plan — ปุ่มกำหนดนัดเมื่อยังไม่มี Meet / conflict check; ถ้ามี Meet แสดงข้อมูลใต้ AI score + ลิงก์เข้าประชุม
**Output:** `GET|POST|PATCH /applicants` แนบ `interview` ล่าสุด (`SCHEDULED`|`RESCHEDULED`) ของ organizer ปัจจุบัน + interviewers; `TrackerApplicant.interview`; `ApplicantDetailInterviewSection` (ฟอร์ม datetime/duration/emails/notes + nested Dialog) + การ์ดสรุปนัด + `Meet` `target=_blank`; `ApplicantTracker` `POST /interviews` + invalidate `applicants` + `interviews-calendar-events` + อัปเดต detail + toast จากร่าง error (`DB_CONFLICT`/`GOOGLE_BUSY` ฯลฯ); `trackerInterviewFromScheduleResponse`; `POST /interviews` include interviewer `title`; cast Prisma `select` interviews→mapper เพราะ inference ไม่ติด nested select
**Edited:** `applicant-routes.ts`, `interview-routes.ts`, `applicant-tracker-model.ts`, `schedule-interview-schema.ts`, `applicant-detail-interview-section.tsx`, `applicant-detail-dialog.tsx`, `applicant-tracker.tsx`, `cowork-log.md`

### [2026-05-10] - Applicant detail: footer schedule + redirect หลังบันทึกนัด
**Prompt:** move schedule button to dialog footer (replace with schedule redirect); when schedule redirect to interviews page
**Output:** `applicant-schedule-interview-dialog.tsx` — dialog ฟอร์มแยกจากเนื้อหาหลัก (portal sibling); state form + open อยู่ `ApplicantDetailDialog`; footer: `กำหนดนัดสัมภาษณ์` เมื่อยังไม่มีนัด, `ไปหน้านัดสัมภาษณ์` → `router.push('/interviews')` แทน `<Link>`; section เดิมเหลือการ์ด/ข้อความว่าง; `scheduleInterviewMut` `onSuccess` → `setDetail(null)` + `router.push('/interviews')`; `key={detail?.id ?? 'closed'}` บน dialog รีเซ็ต state เมื่อสลับผู้สมัคร
**Edited:** `applicant-schedule-interview-dialog.tsx`, `applicant-detail-dialog.tsx`, `applicant-detail-interview-section.tsx`, `applicant-tracker.tsx`, `cowork-log.md`

### [2026-05-10 00:43] - Interviews calendar: add schedule CTA
**Prompt:** `@src/components/ui/fullscreen-calendar.tsx:537-540 implement add schedule logic`
**Output:** ปุ่ม `เพิ่มนัด` ใน `FullScreenCalendar` เรียก `onScheduleForDate(selectedDay)` และ disable เมื่อไม่มี handler/เป็นวันอดีต; หน้า `/interviews` เปิด dialog กำหนดนัดจากวันที่เลือก, เลือกผู้สมัครที่ยังไม่มีนัด, ส่ง `POST /interviews`, invalidate calendar/applicants; schedule dialog รองรับ field แทรกก่อนฟอร์ม + seeded datetime จากวันที่เลือก
**Edited:** `src/components/ui/fullscreen-calendar.tsx`, `src/features/interviews/components/interviews-calendar.tsx`, `src/features/applicants-tracker/components/applicant-schedule-interview-dialog.tsx`, `cowork-log.md`
