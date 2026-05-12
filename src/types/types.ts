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

    type ScreeningStrength = string;
    type ScreeningConcern = string;
    type ScreeningQuestion = string;
  }
}
