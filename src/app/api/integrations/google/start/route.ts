import { signGoogleOAuthState } from "@/lib/google-oauth-state";
import { CALENDAR_EVENTS_SCOPE } from "@/server/google-calendar/google-calendar-service";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบ" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "ยังไม่ตั้งค่า GOOGLE_CLIENT_ID" },
      { status: 500 },
    );
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  const redirectUri = `${base.replace(/\/$/, "")}/api/integrations/google/callback`;
  let state: string;
  try {
    state = signGoogleOAuthState(userId);
  } catch {
    return NextResponse.json(
      {
        error:
          "ตั้งค่า GOOGLE_TOKEN_ENCRYPTION_KEY ใน .env (ความยาวอย่างน้อย 32 ตัวอักษร — ใช้ร่วมเข้ารหัสโทเค็น)",
      },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_EVENTS_SCOPE,
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
