import { auth, clerkClient } from "@clerk/nextjs/server";

/** โยนเมื่อ Clerk ยังไม่มี OAuth access token ของ Google สำหรับ user นี้ (เช่น ไม่ได้ลงชื่อด้วย Google หรือยังไม่ได้ขอ scope ที่ต้องการ) */
export const NO_GOOGLE_OAUTH_TOKEN = "NO_GOOGLE_OAUTH_TOKEN";

export async function getGoogleToken(): Promise<{ token: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("ต้องเข้าสู่ระบบ");
  }
  return getGoogleTokenForUserId(userId);
}

export async function getGoogleTokenForUserId(
  clerkUserId: string,
): Promise<{ token: string }> {
  const client = await clerkClient();
  const res = await client.users.getUserOauthAccessToken(clerkUserId, "google");
  const token = res.data[0]?.token;
  if (!token) {
    throw new Error(NO_GOOGLE_OAUTH_TOKEN);
  }
  return { token };
}
