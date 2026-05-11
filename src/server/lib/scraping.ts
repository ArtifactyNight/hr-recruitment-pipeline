import { apifyClient } from "@/lib/apify";
import type { ScrapedLinkedinProfile } from "@/types/scraping";

export type ScrapeResult =
  | { kind: "linkedin"; url: string; data: ScrapedLinkedinProfile }
  | {
      kind: "other";
      url: string;
      data: { title: string; markdown: string };
    };

export async function scrape(link: string): Promise<ScrapeResult> {
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw Object.assign(new Error("URL ไม่ถูกต้อง"), { statusCode: 400 });
  }
  const h = parsed.hostname.toLowerCase();

  if (h === "linkedin.com" || h.endsWith(".linkedin.com")) {
    const token = process.env.APIFY_API_TOKEN?.trim();
    if (!token) {
      throw Object.assign(new Error("APIFY_API_TOKEN ไม่ได้ตั้งค่า"), {
        statusCode: 503,
      });
    }
    const run = await apifyClient.actor("LpVuK3Zozwuipa5bp").call(
      {
        profileScraperMode: "Profile details no email ($4 per 1k)",
        queries: [link],
      },
      { waitSecs: 120 },
    );
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();
    const profile = items[0] as ScrapedLinkedinProfile | undefined;
    if (!profile) {
      throw Object.assign(new Error("Apify actor ไม่คืนข้อมูลโปรไฟล์"), {
        statusCode: 502,
      });
    }
    return { kind: "linkedin", url: link, data: profile };
  } else if (
    h === "jobsdb.com" ||
    h.endsWith(".jobsdb.com") ||
    h === "th.jobsdb.com" ||
    h.endsWith(".jobsdb.th")
  ) {
    // TODO: JobsDB scraper (Firecrawl / Apify / etc.)
    // const run = await apifyClient.actor("<jobsdb-actor-id>").call({ url: link });
    // const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    // return { kind: "jobsdb", url: link, data: items[0] as ScrapedJobsdbPosting };
    throw Object.assign(new Error("JobsDB scraping ยังไม่ได้ implement"), {
      statusCode: 501,
    });
  } else {
    const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
    if (!apiKey) {
      throw Object.assign(new Error("FIRECRAWL_API_KEY ไม่ได้ตั้งค่า"), {
        statusCode: 503,
      });
    }
    const { default: Firecrawl } = await import("@mendable/firecrawl-js");
    const fc = new Firecrawl({ apiKey });
    const doc = await fc.v1.scrapeUrl(link, {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    if (
      !doc ||
      typeof doc !== "object" ||
      !("success" in doc) ||
      doc.success !== true ||
      !("markdown" in doc) ||
      typeof doc.markdown !== "string" ||
      doc.markdown.trim().length === 0
    ) {
      const errMsg =
        doc &&
        typeof doc === "object" &&
        "error" in doc &&
        typeof (doc as { error?: string }).error === "string"
          ? (doc as { error: string }).error
          : "Firecrawl scrape failed";
      throw Object.assign(new Error(errMsg), { statusCode: 502 });
    }
    const meta = "metadata" in doc ? doc.metadata : undefined;
    const title =
      (meta && typeof meta === "object" && "title" in meta
        ? String((meta as { title?: string }).title ?? "")
        : "") ||
      ("title" in doc && typeof doc.title === "string" ? doc.title : "");
    return {
      kind: "other",
      url: link,
      data: { title: title.trim(), markdown: doc.markdown.trim() },
    };
  }
}
