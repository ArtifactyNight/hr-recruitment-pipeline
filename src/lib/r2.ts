import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function r2AccountId(): string {
  return process.env.R2_ACCOUNT_ID?.trim() ?? "";
}

function r2Bucket(): string {
  return process.env.R2_BUCKET_NAME?.trim() ?? "";
}

function r2AccessKey(): string {
  return process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
}

function r2SecretKey(): string {
  return process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
}

export function isR2Configured(): boolean {
  return (
    r2AccountId().length > 0 &&
    r2Bucket().length > 0 &&
    r2AccessKey().length > 0 &&
    r2SecretKey().length > 0
  );
}

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (client) {
    return client;
  }
  const accountId = r2AccountId();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKey(),
      secretAccessKey: r2SecretKey(),
    },
    forcePathStyle: true,
  });
  return client;
}

export async function putResumePdfToR2(options: {
  objectKey: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  const c = getR2Client();
  await c.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: options.objectKey,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
}

export async function deleteResumeFromR2(objectKey: string): Promise<void> {
  const c = getR2Client();
  await c.send(
    new DeleteObjectCommand({
      Bucket: r2Bucket(),
      Key: objectKey,
    }),
  );
}

/** Read PDF bytes from R2 for server-side AI screening (not a signed URL). */
export async function getResumePdfBytesFromR2(objectKey: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  const c = getR2Client();
  const res = await c.send(
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: objectKey,
    }),
  );
  const body = res.Body;
  if (!body) {
    throw new Error("ไฟล์ว่าง");
  }
  const buf = await body.transformToByteArray();
  const contentType =
    typeof res.ContentType === "string" && res.ContentType.length > 0
      ? res.ContentType
      : "application/pdf";
  return { bytes: buf, contentType };
}

export async function getResumeSignedDownloadUrl(options: {
  objectKey: string;
  /** seconds — default 15 minutes */
  expiresIn?: number;
  filenameHint?: string;
}): Promise<string> {
  const c = getR2Client();
  const cmd = new GetObjectCommand({
    Bucket: r2Bucket(),
    Key: options.objectKey,
    ...(options.filenameHint
      ? {
          ResponseContentDisposition: `attachment; filename="${options.filenameHint.replace(/"/g, "")}"`,
        }
      : {}),
  });
  return getSignedUrl(c, cmd, {
    expiresIn: options.expiresIn ?? 15 * 60,
  });
}

export function resumeObjectKeyForApplicant(
  applicantId: string,
  fileId: string,
): string {
  return `resumes/${applicantId}/${fileId}.pdf`;
}
