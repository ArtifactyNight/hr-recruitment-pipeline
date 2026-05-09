import { clerkClient } from "@clerk/nextjs/server";

export const NO_GOOGLE_OAUTH_TOKEN = "NO_GOOGLE_OAUTH_TOKEN";

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
