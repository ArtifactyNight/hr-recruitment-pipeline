export const screenerKeys = {
  jobs: () => ["screener-jobs"] as const,
  jobDetail: (id: string | null) => ["screener-job-detail", id] as const,
};
