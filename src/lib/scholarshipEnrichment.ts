import { Scholarship, ScholarshipEnrichment, ScholarshipEnrichmentFile } from "@/data/scholarships";

const ENRICHMENT_URL = `${import.meta.env.BASE_URL}data/scholarship-enrichment.json`;

let enrichmentCache: Promise<ScholarshipEnrichment[]> | null = null;

export function normalizeScholarshipName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " och ")
    .replace(/\baktiebolag\b|\bab\b/g, "")
    .replace(/\b(stiftelsens|stiftelserna|stiftelsen|stiftelser|stiftelse|stipendiestiftelsen|stipendiestiftelse|stipendiefonden|stipendiefond|stipendierna|stipendier|stipendiet|stipendium|fonden|fond)\b/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const normalizeFoundationName = normalizeScholarshipName;

function urlKey(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

async function loadScholarshipEnrichment(): Promise<ScholarshipEnrichment[]> {
  if (!enrichmentCache) {
    enrichmentCache = fetch(ENRICHMENT_URL)
      .then((response) => response.ok ? response.json() as Promise<ScholarshipEnrichmentFile> : null)
      .then((data) => data?.items ?? [])
      .catch(() => []);
  }
  return enrichmentCache;
}

function candidateKeys(scholarship: Scholarship): string[] {
  return [
    scholarship.name,
    scholarship.organization,
    scholarship.source?.name,
  ]
    .map(normalizeScholarshipName)
    .filter(Boolean);
}

export function findScholarshipEnrichment(
  scholarship: Scholarship,
  enrichmentItems: ScholarshipEnrichment[],
): ScholarshipEnrichment | null {
  const keys = new Set(candidateKeys(scholarship));
  const urls = [
    scholarship.applicationUrl,
    scholarship.officialWebsite,
    scholarship.sourceUrl,
    scholarship.source?.officialWebsite,
    scholarship.source?.sourceUrl,
  ].map(urlKey).filter(Boolean);

  for (const item of enrichmentItems) {
    if (item.nameKey && keys.has(item.nameKey)) return item;
    if (item.foundationKey && keys.has(item.foundationKey)) return item;
    if (item.url && urls.includes(urlKey(item.url))) return item;
  }

  return null;
}

function mergeRequirements(current: string[], extra: string | null): string[] {
  if (!extra?.trim()) return current ?? [];
  const seen = new Set<string>();
  const next = [extra.trim(), ...(current ?? [])].filter((value) => {
    const key = normalizeScholarshipName(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return next;
}

export function mergeScholarshipWithEnrichment(
  scholarship: Scholarship,
  enrichment: ScholarshipEnrichment | null,
): Scholarship {
  if (!enrichment) return scholarship;

  const matchedBy = enrichment.nameKey && candidateKeys(scholarship).includes(enrichment.nameKey)
    ? "name"
    : enrichment.foundationKey && candidateKeys(scholarship).includes(enrichment.foundationKey)
      ? "foundation"
      : "url";

  return {
    ...scholarship,
    requirements: mergeRequirements(scholarship.requirements ?? [], enrichment.requirements),
    amount: enrichment.amount ?? scholarship.amount ?? null,
    amountText: enrichment.amountText ?? scholarship.amountText ?? null,
    deadline: enrichment.deadline ?? scholarship.deadline ?? null,
    applicationUrl: enrichment.url ?? scholarship.applicationUrl ?? null,
    externalInfoStatus: enrichment.url ? "direct" : scholarship.externalInfoStatus,
    enrichment: {
      source: "csv",
      matchedBy,
      name: enrichment.name,
      foundation: enrichment.foundation,
      url: enrichment.url,
    },
  };
}

export async function enrichScholarships(items: Scholarship[]): Promise<Scholarship[]> {
  const enrichment = await loadScholarshipEnrichment();
  if (enrichment.length === 0) return items;
  return items.map((item) => mergeScholarshipWithEnrichment(item, findScholarshipEnrichment(item, enrichment)));
}
