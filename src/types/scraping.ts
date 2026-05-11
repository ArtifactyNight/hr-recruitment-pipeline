export type ScrapedLinkedinProfile = {
  id: string;
  publicIdentifier: string;
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  emails: Array<string>;
  headline: string;
  openToWork: boolean;
  hiring: boolean;
  premium: boolean;
  influencer: boolean;
  memorialized: boolean;
  creator: boolean;
  location: {
    linkedinText: string;
    countryCode: string;
    parsed: {
      text: string;
      countryCode: string;
      regionCode: string;
      country: string;
      countryFull: string;
      state: string;
      city: string;
    };
  };
  objectUrn: string;
  registeredAt: string;
  topSkills: Array<string>;
  connectionsCount: number;
  followerCount: number;
  verified: boolean;
  about: string;
  currentPosition: Array<{
    position: string;
    location: string;
    employmentType: string;
    workplaceType: string;
    compstringName: string;
    compstringLinkedinUrl: string;
    compstringId: string;
    compstringUniversalName: string;
    duration: string;
    description: string;
    skills: Array<string>;
    experienceGroupId: string;
    startDate: {
      month: string;
      year: number;
      text: string;
    };
    endDate: {
      text: string;
    };
    compstringLogo: {
      url: string;
      sizes: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    };
  }>;
  profileTopEducation: Array<{
    schoolName: string;
    schoolLinkedinUrl: string;
    schoolId: string;
    degree: string;
    schoolLogo: string;
  }>;
  profileActions: Array<string>;
  profilePicture: {
    url: string;
    sizes: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  coverPicture: string;
  photo: string;
  profileLocales: Array<{
    country: string;
    language: string;
  }>;
  primaryLocale: {
    country: string;
    language: string;
  };
  multiLocaleHeadline: Array<{
    headline: string;
    locale: string;
  }>;
  services: Array<string>;
  experience: Array<{
    position: string;
    location?: string;
    employmentType?: string;
    workplaceType?: string;
    compstringName: string;
    compstringLinkedinUrl: string;
    compstringId?: string;
    compstringUniversalName?: string;
    duration: string;
    description?: string;
    skills: Array<string>;
    experienceGroupId?: string;
    startDate: {
      month: string;
      year: number;
      text: string;
    };
    endDate: {
      text: string;
      month?: string;
      year?: number;
    };
    compstringLogo?: {
      url: string;
      sizes: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    };
  }>;
  education: Array<{
    schoolName: string;
    schoolLinkedinUrl: string;
    schoolId: string;
    degree: string;
    schoolLogo: string;
  }>;
  certifications: Array<string>;
  projects: Array<string>;
  volunteering: Array<string>;
  receivedRecommendations: Array<string>;
  skills: Array<{
    name: string;
    positions?: Array<string>;
  }>;
  publications: Array<string>;
  courses: Array<string>;
  patents: Array<string>;
  honorsAndAwards: Array<string>;
  languages: Array<string>;
  causes: Array<string>;
  featured: string;
  composeOptionType: string;
  organizations: Array<string>;
  moreProfiles: Array<{
    id: string;
    firstName: string;
    lastName: string;
    position?: string;
    publicIdentifier: string;
    linkedinUrl: string;
  }>;
  originalQuery: {
    query: string;
  };
};
