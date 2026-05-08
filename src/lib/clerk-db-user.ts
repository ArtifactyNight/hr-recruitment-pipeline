import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

export async function ensureUserFromClerkId(
  clerkId: string,
): Promise<{
  id: number;
  clerkId: string;
  email: string;
  name: string | null;
}> {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) {
    return existing;
  }

  const clerk = await clerkClient();
  const u = await clerk.users.getUser(clerkId);
  const primary = u.emailAddresses.find(
    (e) => e.id === u.primaryEmailAddressId,
  );
  const email =
    primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
  if (!email) {
    throw new Error("บัญชี Clerk ไม่มีอีเมล");
  }
  const name =
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null;

  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name },
    update: { email, name },
  });
}
