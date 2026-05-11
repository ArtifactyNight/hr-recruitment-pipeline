export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

export function extractScrapedTitle(html: string): string {
  const ogTitle =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i.exec(
      html,
    );
  if (ogTitle?.[1]) {
    return decodeHtmlEntities(ogTitle[1]).trim();
  }
  const titleTag = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (titleTag?.[1]) {
    return decodeHtmlEntities(titleTag[1]).trim();
  }
  return "";
}

export function extractScrapedMeta(html: string, name: string): string {
  const safe = name.replace(/[^a-z0-9:_-]/gi, "");
  const ogPattern = new RegExp(
    `<meta[^>]+property=["']og:${safe}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const og = ogPattern.exec(html);
  if (og?.[1]) {
    return decodeHtmlEntities(og[1]).trim();
  }
  const namePattern = new RegExp(
    `<meta[^>]+name=["']${safe}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const m = namePattern.exec(html);
  if (m?.[1]) {
    return decodeHtmlEntities(m[1]).trim();
  }
  return "";
}

export function isAllowedCandidateProfileHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "linkedin.com" ||
    h.endsWith(".linkedin.com") ||
    h === "jobsdb.com" ||
    h.endsWith(".jobsdb.com") ||
    h === "hk.jobsdb.com" ||
    h.endsWith(".jobsdb.hk")
  );
}

const MIN_EXTRACTED_CHARS = 280;

async function scrapeWithFirecrawl(
  url: string,
  apiKey: string,
): Promise<{ text: string; title: string }> {
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const fc = new Firecrawl({ apiKey });
  const doc = await fc.v1.scrapeUrl(url, {
    formats: ["markdown"],
    onlyMainContent: true,
  });

  if (
    doc &&
    typeof doc === "object" &&
    "success" in doc &&
    doc.success === true &&
    "markdown" in doc &&
    typeof doc.markdown === "string" &&
    doc.markdown.trim().length > 0
  ) {
    const meta = "metadata" in doc ? doc.metadata : undefined;
    const title =
      (meta && typeof meta === "object" && "title" in meta
        ? String((meta as { title?: string }).title ?? "")
        : "") ||
      ("title" in doc && typeof doc.title === "string" ? doc.title : "");
    return { text: doc.markdown.trim(), title: title.trim() };
  }

  const errMsg =
    doc &&
    typeof doc === "object" &&
    "error" in doc &&
    typeof (doc as { error?: string }).error === "string"
      ? (doc as { error: string }).error
      : "Firecrawl scrape failed";

  throw Object.assign(new Error(errMsg), { statusCode: 502 });
}

export async function scrapeCandidateProfileUrl(
  url: string,
): Promise<{ text: string; title: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("URL ไม่ถูกต้อง"), { statusCode: 400 });
  }

  if (!isAllowedCandidateProfileHost(parsed.hostname)) {
    throw Object.assign(
      new Error("อนุญาตเฉพาะ URL โปรไฟล์ LinkedIn หรือ JobsDB"),
      { statusCode: 400 },
    );
  }

  let title = "";
  let text = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HR-Recruit-Bot/1.0; +https://example.com/bot)",
        accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const html = await res.text();
      title = extractScrapedTitle(html);
      text = stripHtml(html);
    }
  } catch {
    // retry below via Firecrawl if possible
  }

  const trimmed = text.trim();
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();

  if (trimmed.length >= MIN_EXTRACTED_CHARS) {
    return {
      text: trimmed,
      title: title.trim(),
    };
  }

  if (apiKey) {
    const fc = await scrapeWithFirecrawl(url, apiKey);
    if (
      fc.text.length >= MIN_EXTRACTED_CHARS ||
      fc.text.length > trimmed.length
    ) {
      return fc;
    }
    if (fc.text.length > 0) {
      return fc;
    }
  }

  throw Object.assign(
    new Error(
      "ดึงข้อความโปรไฟล์ได้น้อยเกินไป — ลองวางข้อความจากหน้าโปรไฟล์แทน หรือตั้ง FIRECRAWL_API_KEY เพื่อดึงแบบเรนเดอร์",
    ),
    { statusCode: 502 },
  );
}
