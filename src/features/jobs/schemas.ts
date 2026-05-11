import { z } from "zod";

export const createJobFormSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่อตำแหน่ง"),
  description: z.string().min(1, "กรุณากรอกรายละเอียดงาน"),
  requirements: z.string().min(1, "กรุณากรอกคุณสมบัติ"),
  isActive: z.boolean(),
});

export type CreateJobFormValues = z.infer<typeof createJobFormSchema>;
