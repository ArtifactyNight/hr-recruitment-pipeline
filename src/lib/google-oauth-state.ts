import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const k = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!k || k.length < 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY ต้องตั้งค่า (ความยาวอย่างน้อย 32 ตัวอักษร)",
    );
  }
  return k;
}

export function signGoogleOAuthState(clerkUserId: string): string {
  const payload = JSON.stringify({
    c: clerkUserId,
    t: Date.now(),
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyGoogleOAuthState(
  signed: string,
  maxAgeMs = 600_000,
): { clerkUserId: string } {
  const [b64, sig] = signed.split(".");
  if (!b64 || !sig) {
    throw new Error("state ไม่ถูกต้อง");
  }
  const expected = createHmac("sha256", secret())
    .update(b64)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("signature ไม่ถูกต้อง");
  }
  const raw = Buffer.from(b64, "base64url").toString("utf8");
  const parsed = JSON.parse(raw) as { c: string; t: number };
  if (typeof parsed.c !== "string" || typeof parsed.t !== "number") {
    throw new Error("payload ไม่ถูกต้อง");
  }
  if (Date.now() - parsed.t > maxAgeMs) {
    throw new Error("OAuth state หมดอายุ ลองเชื่อมใหม่");
  }
  return { clerkUserId: parsed.c };
}
