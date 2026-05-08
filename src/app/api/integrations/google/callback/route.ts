import { ensureUserFromClerkId } from "@/lib/clerk-db-user";
import { verifyGoogleOAuthState } from "@/lib/google-oauth-state";
import { encryptGoogleRefreshToken } from "@/lib/google-token-crypto";
import prisma from "@/lib/prisma";
import {
  CALENDAR_EVENTS_SCOPE,
  exchangeAuthCode,
} from "@/server/google-calendar/google-calendar-service";
import { NextResponse, type NextRequest } from "next/server";

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    throw new Error("ดึงข้อมูล Google user ไม่สำเร็จ");
  }
  const j = (await r.json()) as { email?: string };
  return j.email ?? "";
}

export async function GET(request: NextRequest) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  const interviewsUrl = `${base.replace(/\/$/, "")}/interviews`;

  const err = request.nextUrl.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent(err)}`,
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent("ไม่มี code หรือ state")}`,
    );
  }

  let clerkUserId: string;
  try {
    ({ clerkUserId } = verifyGoogleOAuthState(state));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "state ไม่ถูกต้อง";
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent(msg)}`,
    );
  }

  let tokens: Awaited<ReturnType<typeof exchangeAuthCode>>;
  try {
    tokens = await exchangeAuthCode(code);
  } catch {
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent("แลก code กับ Google ไม่สำเร็จ")}`,
    );
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent("ไม่ได้รับ refresh token — ลองถอนการอนุญาตแอปใน Google แล้วเชื่อมใหม่")}`,
    );
  }

  const access = tokens.access_token;
  if (!access) {
    return NextResponse.redirect(
      `${interviewsUrl}?google=error&message=${encodeURIComponent("ไม่มี access token")}`,
    );
  }

  let googleEmail: string;
  try {
    googleEmail = await fetchGoogleEmail(access);
  } catch {
    googleEmail = "";
  }

  const dbUser = await ensureUserFromClerkId(clerkUserId);
  const enc = encryptGoogleRefreshToken(tokens.refresh_token);

  await prisma.userGoogleCalendar.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
      refreshTokenEncrypted: enc,
      googleEmail: googleEmail || dbUser.email,
      scopes: CALENDAR_EVENTS_SCOPE,
    },
    update: {
      refreshTokenEncrypted: enc,
      googleEmail: googleEmail || dbUser.email,
      scopes: CALENDAR_EVENTS_SCOPE,
    },
  });

  return NextResponse.redirect(`${interviewsUrl}?google=connected`);
}
