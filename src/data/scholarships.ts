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
  descriptionEn?: string | null;
  targetGroup: string[];
  requirements: string[];
  location: string | null;
  educationLevel: string | null;
  fieldOfStudy: string[];
  amount: number | null;
  amountText?: string | null;
  deadline: string | null;
  applicationUrl: string | null;
  sourceUrl?: string | null;
  officialWebsite?: string | null;
  lastChecked?: string | null;
  externalInfoStatus?: "direct" | "search-fallback" | "unknown" | null;
  source: ScholarshipSource;
  tags: string[];
  criteria: string[];
  eligibleUniversities: string[];
  eligibleFields: string[];
  eligibleLocations: string[];
  purposes?: string[];
  needBased?: boolean;
  engagementRequired?: boolean;
  enrichment?: ScholarshipEnrichmentMatch | null;
}

export interface ScholarshipEnrichment {
  name: string;
  foundation: string | null;
  amount: number | null;
  amountText?: string | null;
  requirements: string | null;
  deadline: string | null;
  url: string | null;
  nameKey: string;
  foundationKey: string | null;
}

export interface ScholarshipEnrichmentMatch {
  source: "csv";
  matchedBy: "name" | "foundation" | "url";
  name: string;
  foundation: string | null;
  url: string | null;
}

export interface ScholarshipEnrichmentFile {
  generatedAt: string;
  sourceFile: string | null;
  count: number;
  description: string;
  items: ScholarshipEnrichment[];
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
