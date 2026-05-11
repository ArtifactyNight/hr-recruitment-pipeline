/** Shared HTML → text helpers for job posting and profile URL scraping */

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtmlEntities(value: string): string {
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
