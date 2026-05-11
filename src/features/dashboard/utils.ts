export const routeSegmentLabels: Record<string, string> = {
  screener: "ตรวจสอบ Resume",
  interviews: "นัดหมายสัมภาษณ์",
  candidates: "ผู้สมัคร",
  jobs: "ตำแหน่งงาน",
  settings: "ตั้งค่า",
};

export function labelForDynamicSegment(
  segment: string,
  segmentIndex: number,
  segments: Array<string>,
): string {
  const prev = segmentIndex > 0 ? segments[segmentIndex - 1] : undefined;
  if (prev === "candidates" || prev === "jobs" || prev === "interviews") {
    return "รายละเอียด";
  }
  return segment;
}
