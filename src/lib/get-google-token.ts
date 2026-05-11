import prisma from "@/lib/prisma";

export const NO_GOOGLE_OAUTH_TOKEN = "NO_GOOGLE_OAUTH_TOKEN";

export async function getGoogleTokenForUserId(
  userId: string,
): Promise<{ token: string }> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: {
      id: true,
      accessToken: true,
      accessTokenExpiresAt: true,
      refreshToken: true,
    },
  });

  if (!account?.accessToken) {
    throw new Error(NO_GOOGLE_OAUTH_TOKEN);
  }

  const now = new Date();
  if (!account.accessTokenExpiresAt || account.accessTokenExpiresAt > now) {
    return { token: account.accessToken };
  }

  if (!account.refreshToken) {
    throw new Error(NO_GOOGLE_OAUTH_TOKEN);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(NO_GOOGLE_OAUTH_TOKEN);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const newExpiry = new Date(now.getTime() + data.expires_in * 1000);

  await prisma.account.update({
    where: { id: account.id },
    data: { accessToken: data.access_token, accessTokenExpiresAt: newExpiry },
  });

  return { token: data.access_token };
}
