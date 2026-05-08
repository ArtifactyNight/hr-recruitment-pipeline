import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

let r2S3Client: S3Client | undefined;

/**
 * S3-compatible client for Cloudflare R2 (ใช้บนเซิร์ฟเวอร์เท่านั้น)
 * @see https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
 */
export function getR2S3Client(): S3Client {
  if (r2S3Client) {
    return r2S3Client;
  }

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  r2S3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2S3Client;
}

export function getR2BucketName(): string {
  return requireEnv("R2_BUCKET_NAME");
}

/** โดเมนสาธารณะ (r2.dev หรือ custom domain) — ตัด trailing slash */
export function getR2PublicBaseUrl(): string {
  return requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

/** URL สำหรับอ่านไฟล์ผ่าน public access — ไม่ใช่ S3 API endpoint */
export function getR2PublicObjectUrl(key: string): string {
  const base = getR2PublicBaseUrl();
  const safeKey = key.replace(/^\/+/, "");
  const encoded = safeKey.split("/").map(encodeURIComponent).join("/");
  return `${base}/${encoded}`;
}
