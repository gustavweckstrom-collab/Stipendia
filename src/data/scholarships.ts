export interface ScholarshipSource {
  name: string;
  originalId?: string | null;
  orgNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  sourceUrl?: string | null;
  officialWebsite?: string | null;
}

export interface Scholarship {
  id: string;
  name: string;
  organization: string;
  description: string;
  targetGroup: string[];
  requirements: string[];
  location: string | null;
  educationLevel: string | null;
  fieldOfStudy: string[];
  amount: number | null;
  deadline: string | null;
  applicationUrl: string | null;
  sourceUrl?: string | null;
  officialWebsite?: string | null;
  lastChecked?: string | null;
  externalInfoStatus?: "direct" | "search-fallback" | "unknown" | null;
  source: ScholarshipSource;
  tags: string[];
  criteria: string[];
  requiredDocuments: string[];
  eligibleUniversities: string[];
  eligibleFields: string[];
  eligibleLocations: string[];
  purposes?: string[];
  needBased?: boolean;
  engagementRequired?: boolean;
}

export interface ScholarshipChunkInfo {
  file: string;
  start: number;
  end: number;
  count: number;
}

export interface ScholarshipIndex {
  total: number;
  pageSize: number;
  chunks: ScholarshipChunkInfo[];
  fields: string[];
  fieldChunks?: Record<string, { count: number; chunks: string[] }>;
  locations: string[];
  idToChunk?: Record<string, string>;
  totalOriginalCount?: number;
  totalFilteredCount?: number;
  filterDescription?: string;
  generatedAt?: string;
  generatedFrom: string;
}
