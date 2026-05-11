/* eslint-disable @typescript-eslint/no-namespace */
export {};

declare global {
  namespace PrismaJson {
    type ApplicantExperience = {
      company: string;
      role: string;
      description?: string;
    };

    type ApplicantEducation = {
      school: string;
      degree: string;
    };
  }
}
