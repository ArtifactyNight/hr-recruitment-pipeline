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
| `NEXT_PUBLIC_APP_URL` | Base URL ของแอป เช่น `http://localhost:3000` |
| `GOOGLE_*` | **ไม่ใช้แล้ว** — Calendar ใช้ Clerk Google OAuth + `getUserOauthAccessToken` |

หลังเปลี่ยน schema: `nr prisma generate` + `nr prisma db push` (หรือ migrate ตามทีม).

## Google Calendar / Meet (Module Interview Scheduler)

1. ใน [Clerk Dashboard](https://dashboard.clerk.com) เปิดการลงชื่อเข้าด้วย **Google** และเพิ่ม OAuth scope **`https://www.googleapis.com/auth/calendar`**
2. ผู้ใช้ลงชื่อเข้าด้วย Google — Clerk ออก OAuth access token ให้ backend ใช้ (`src/lib/get-google-token.ts` → `getUserOauthAccessToken(userId, "google")`)
3. **Meet** สร้างผ่าน Calendar API (`conferenceData`) — **Google ส่งอีเมลปฏิทิน** ไปยัง attendees ด้วย `sendUpdates=all`
4. **กันซ้อน**: `Interview` ของ `organizerUserId` เดียวกัน + `freebusy.query` บน `primary`
5. **ยกเลิกนัด**: `Interview.status` → `CANCELLED` และ `Applicant.stage` → `PRE_SCREEN_CALL`
6. **สร้างนัด**: `Applicant.stage` → `FIRST_INTERVIEW` เมื่อสร้างสำเร็จ

> ตาราง `UserGoogleCalendar` ใน Prisma ยังคงอยู่แต่ flow ใหม่ไม่เขียนลงนี้แล้ว — ลบ model ทีหลังได้ถ้าต้องการ

## Architecture (API)

`src/app/api/[[...slugs]]/route.ts` forwards ไป Elysia `src/server/elysia-app.ts`:

- `/api/interviews` — CRUD นัด + sync Google
- `/api/interviewers` — list สำหรับเลือกบน UI

## Scripts

```bash
nr dev      # dev server
nr build    # production build
nr lint     # ESLint
```
