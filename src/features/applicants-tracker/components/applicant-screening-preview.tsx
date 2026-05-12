"use client";

import type { TrackerApplicant } from "@/features/applicants-tracker/types";

export function ApplicantScreeningPreviewContent({
  applicant,
}: {
  applicant: TrackerApplicant;
}) {
  const blocks: Array<{
    title: string;
    items: Array<string>;
    emptyMessage: string;
  }> = [
    {
      title: "จุดแข็ง",
      items: applicant.strengths,
      emptyMessage: "ยังไม่มีจุดแข็งจาก AI",
    },
    {
      title: "ข้อกังวล",
      items: applicant.gaps,
      emptyMessage: "ยังไม่มีช่องว่างหรือข้อกังวลจาก AI",
    },
    {
      title: "คำถามที่ควรถาม",
      items: applicant.suggestedQuestions,
      emptyMessage: "ยังไม่มีคำถามแนะนำจาก AI",
    },
  ];
  const hasScreeningPreview = blocks.some((block) => block.items.length > 0);

  if (!hasScreeningPreview) {
    return (
      <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
        ยังไม่มีข้อมูล strength, gap หรือคำถามที่บันทึกไว้ กด “วิเคราะห์ด้วย AI”
        เพื่อสร้าง preview จาก resume/CV
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => (
        <section key={block.title} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{block.title}</h3>
            <p className="text-xs text-muted-foreground">
              {block.items.length} รายการ
            </p>
          </div>
          {block.items.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {block.items.map((item, index) => (
                <li
                  key={`${block.title}-${String(index)}-${item.slice(0, 24)}`}
                  className="flex gap-2 text-sm leading-relaxed"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              {block.emptyMessage}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
