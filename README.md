# HR Recruitment Pipeline

Mini recruiting tool: AI resume screener, applicant tracker (kanban/table), job descriptions, **Interview Scheduler** (Google Calendar + Meet).

## Stack

Next.js 16 (App Router), React 19, Tailwind, shadcn/ui, Clerk auth, Elysia API (`/api`), Prisma + PostgreSQL, `@tanstack/react-query` + Eden (`@/lib/api`), `react-big-calendar` ปฏิทินหน้า `/interviews` ใช้สไตล์ [shadcn-ui-big-calendar](https://github.com/list-jonas/shadcn-ui-big-calendar) (`src/components/shadcn-big-calendar/`).

## Getting started

```bash
ni
# ตั้งค่า env (ดูด้านล่าง)
nr prisma db push
nr dev
```

เปิด [http://localhost:3000](http://localhost:3000) และล็อกอิน Clerk

## Environment

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `NEXT_PUBLIC_APP_URL` | Base URL ของแอป เช่น `http://localhost:3000` (ใช้สร้าง OAuth redirect) |
| `GOOGLE_CLIENT_ID` | OAuth client (Web) |
| `GOOGLE_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | สตริงยาว ≥32 ตัวอักษร สำหรับเข้ารหัส refresh token กับ OAuth state |

หลังเปลี่ยน schema: `nr prisma generate` + `nr prisma db push` (หรือ migrate ตามทีม).

## Google Calendar / Meet (Module Interview Scheduler)

1. ใน Google Cloud Console สร้าง OAuth **Web client** ใส่ **Authorized redirect URI** เป็น  
   `{NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`  
   (เช่น `http://localhost:3000/api/integrations/google/callback`)
2. OAuth scope แอปขอ: `https://www.googleapis.com/auth/calendar` (ใน Consent Screen ให้เพิ่ม scope เดียวกัน). ถ้าเคยเชื่อมด้วย scope เก่า ให้ถอนการอนุญาตแอปที่ [ความปลอดภัยบัญชี Google](https://myaccount.google.com/permissions) แล้วกดเชื่อมใหม่จาก `/interviews`
3. ในแอปเปิด `/interviews` แล้วกด **เชื่อมบัญชี Google** — จะไป `/api/integrations/google/start` และ callback เก็บ refresh token ที่เข้ารหัสใน `UserGoogleCalendar`
4. **Meet** สร้างผ่าน Calendar API (`conferenceData` / Google Meet) — ไม่ใช้ Meet REST แยก **และ Google ส่งอีเมลปฏิทินไปยัง attendees** (อีเมลผู้สมัคร + กรรมการที่เลือก) ด้วยพารามิเตอร์ `sendUpdates=all` ตอนสร้าง / แก้ / ยกเลิกนัดบน Google
5. **กันซ้อน**: นัด `Interview` เดียวกันกับ `organizerUserId` + `freebusy.query` ของปฏิทิน `primary` ของผู้จัด
6. **ยกเลิกนัด**: `Interview.status` → `CANCELLED` และ `Applicant.stage` → `PRE_SCREEN_CALL`
7. **สร้างนัด**: `Applicant.stage` → `FIRST_INTERVIEW` เมื่อสร้างสำเร็จ

## Architecture (API)

`src/app/api/[[...slugs]]/route.ts` forwards ไป Elysia `src/server/elysia-app.ts`:

- `/api/interviews` — CRUD นัด + sync Google
- `/api/interviewers` — list สำหรับเลือกบน UI
- `/api/integrations/google/status` — สถานะเชื่อม Calendar

OAuth start/callback: `src/app/api/integrations/google/*`

## Scripts

```bash
nr dev      # dev server
nr build    # production build
nr lint     # ESLint
```
