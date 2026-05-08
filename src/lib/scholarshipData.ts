import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import { getLang } from "@/lib/i18n";

const DATA_ROOT = `${import.meta.env.BASE_URL}data/scholarships/`;

let indexCache: Promise<ScholarshipIndex> | null = null;
const chunkCache = new Map<string, Promise<Scholarship[]>>();

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`${DATA_ROOT}${file}`);
  if (!response.ok) throw new Error(`Kunde inte ladda stipendiedata: ${file}`);
  return response.json() as Promise<T>;
}

export function loadScholarshipIndex(): Promise<ScholarshipIndex> {
  if (!indexCache) indexCache = fetchJson<ScholarshipIndex>("index.json");
  return indexCache;
}

export function loadScholarshipChunk(file: string): Promise<Scholarship[]> {
  if (!chunkCache.has(file)) chunkCache.set(file, fetchJson<Scholarship[]>(file));
  return chunkCache.get(file)!;
}

export async function loadFirstScholarshipChunk() {
  const index = await loadScholarshipIndex();
  const first = index.chunks[0];
  return { index, items: first ? await loadScholarshipChunk(first.file) : [], nextChunk: first ? 1 : 0 };
}

export function chunkIndexForScholarshipId(id: string, index: ScholarshipIndex): number | null {
  const match = id.match(/^foundation-(\d+)$/);
  if (!match) return null;
  const position = Number(match[1]);
  if (!Number.isFinite(position) || position < 1) return null;
  const chunkIndex = Math.floor((position - 1) / index.pageSize);
  return index.chunks[chunkIndex] ? chunkIndex : null;
}

function chunkFileForScholarshipId(id: string, index: ScholarshipIndex): string | null {
  const mappedFile = index.idToChunk?.[id];
  if (mappedFile) return mappedFile;
  const chunkIndex = chunkIndexForScholarshipId(id, index);
  return chunkIndex === null ? null : index.chunks[chunkIndex]?.file ?? null;
}

export async function loadScholarshipById(id: string): Promise<Scholarship | null> {
  const index = await loadScholarshipIndex();
  const chunkFile = chunkFileForScholarshipId(id, index);
  if (!chunkFile) return null;
  const chunk = await loadScholarshipChunk(chunkFile);
  return chunk.find((item) => item.id === id) ?? null;
}

export async function loadScholarshipsByIds(ids: string[]): Promise<Scholarship[]> {
  const index = await loadScholarshipIndex();
  const byChunk = new Map<string, Set<string>>();
  ids.forEach((id) => {
    const chunkFile = chunkFileForScholarshipId(id, index);
    if (chunkFile) {
      if (!byChunk.has(chunkFile)) byChunk.set(chunkFile, new Set());
      byChunk.get(chunkFile)!.add(id);
    }
  });
  const results: Scholarship[] = [];
  await Promise.all(Array.from(byChunk.entries()).map(async ([chunkFile, idSet]) => {
    const chunk = await loadScholarshipChunk(chunkFile);
    chunk.forEach((item) => {
      if (idSet.has(item.id)) results.push(item);
    });
  }));
  return ids.map((id) => results.find((item) => item.id === id)).filter(Boolean) as Scholarship[];
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_x000D_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function looseIncludes(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function cleanLabel(value: string | null | undefined): string {
  const text = (value ?? "").replace(/_x000D_/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text === text.toLowerCase() ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function scholarshipLocationLabel(scholarship: Scholarship): string | null {
  return cleanLabel(scholarship.location || scholarship.source?.city || null) || null;
}

function isLocationLike(candidate: string, scholarship: Scholarship): boolean {
  const locations = [scholarship.location, scholarship.source?.city, scholarship.source?.postalCode]
    .filter(Boolean)
    .map((value) => normalizeText(value));
  const normalized = normalizeText(candidate);
  return locations.some((location) => location && (normalized === location || location.includes(normalized)));
}

export function primaryScholarshipCategory(scholarship: Scholarship): string | null {
  const candidates = [
    ...(scholarship.fieldOfStudy ?? []),
    ...(scholarship.purposes ?? []),
    ...(scholarship.targetGroup ?? []),
    ...(scholarship.tags ?? []),
  ];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const label = cleanLabel(candidate);
    const normalized = normalizeText(label);
    if (!label || seen.has(normalized)) continue;
    seen.add(normalized);
    if (isLocationLike(label, scholarship)) continue;
    if (normalized === "studenter") continue;
    return label;
  }
  return null;
}

export function distinctEligibilityRequirements(scholarship: Scholarship): string[] {
  const description = normalizeText(scholarship.description);
  const seen = new Set<string>();
  return [...(scholarship.requirements ?? []), ...(scholarship.criteria ?? [])]
    .map(cleanLabel)
    .filter((text) => {
      const normalized = normalizeText(text);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      if (!description) return true;
      if (normalized === description) return false;
      if (normalized.length > 80 && description.includes(normalized)) return false;
      return true;
    });
}

function currentLangLabels() {
  const en = getLang() === "en";
  return {
    university: en ? "University or college studies" : "Universitet eller högskola",
    student: en ? "Student" : "Student",
    need: en ? "Financial need may matter" : "Ekonomiskt behov kan vara relevant",
    fieldPrefix: en ? "Study field" : "Ämnesområde",
    locationPrefix: en ? "Local or regional connection" : "Koppling till ort eller region",
    exchange: en ? "Studies abroad or exchange" : "Utlandsstudier eller utbyte",
    thesis: en ? "Thesis or degree project" : "Examensarbete eller uppsats",
    practice: en ? "Internship or practice" : "Praktik",
    engagement: en ? "Engagement or volunteer work" : "Engagemang eller ideellt arbete",
    review: en ? "Eligibility needs review" : "Behörighet behöver kontrolleras",
  };
}

function hasText(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(normalizeText(pattern)));
}

export function eligibilityHighlights(scholarship: Scholarship): string[] {
  const labels = currentLangLabels();
  const text = normalizeText([
    scholarship.name,
    scholarship.description,
    ...(scholarship.criteria ?? []),
    ...(scholarship.targetGroup ?? []),
    ...(scholarship.tags ?? []),
    ...(scholarship.purposes ?? []),
  ].join(" "));
  const highlights: string[] = [];
  const add = (value: string | null | undefined) => {
    const label = cleanLabel(value);
    if (!label) return;
    const normalized = normalizeText(label);
    if (!highlights.some((item) => normalizeText(item) === normalized)) highlights.push(label);
  };

  if (hasText(text, ["universitet", "högskola", "hogskola", "eftergymnasial", "akademiska studier", "högre utbildning", "hogre utbildning"])) {
    add(labels.university);
  } else if (hasText(text, ["student", "studenter", "studerande"])) {
    add(labels.student);
  }

  if (scholarship.needBased || (scholarship.targetGroup ?? []).some((group) => normalizeText(group).includes("behov"))) add(labels.need);
  if ((scholarship.fieldOfStudy ?? []).length > 0) add(`${labels.fieldPrefix}: ${scholarship.fieldOfStudy.slice(0, 2).map(cleanLabel).join(", ")}`);

  const location = scholarshipLocationLabel(scholarship);
  if (location && hasText(text, ["från", "bosatt", "hemmahörande", "anknytning", "född", "uppväxt", "kommun", "län", "nation"])) {
    add(`${labels.locationPrefix}: ${location}`);
  }

  if (hasText(text, ["utlandsstudier", "utbyte", "utbytesstudier", "studier utomlands"])) add(labels.exchange);
  if (hasText(text, ["examensarbete", "uppsatsarbete", "kandidatuppsats", "masteruppsats"])) add(labels.thesis);
  if (hasText(text, ["praktik"])) add(labels.practice);
  if (scholarship.engagementRequired) add(labels.engagement);

  return highlights.length > 0 ? highlights : [labels.review];
}

export function applicationTargetUrl(scholarship: Scholarship): string | null {
  return scholarship.applicationUrl || scholarship.officialWebsite || scholarship.sourceUrl || scholarship.source?.officialWebsite || scholarship.source?.sourceUrl || null;
}

export function hasDirectApplicationTarget(scholarship: Scholarship): boolean {
  return Boolean(applicationTargetUrl(scholarship));
}

export function externalApplicationUrl(scholarship: Scholarship): string {
  const directUrl = applicationTargetUrl(scholarship);
  if (directUrl) return directUrl;
  const query = encodeURIComponent(`${scholarship.name} stipendium ansökan`);
  return `https://www.google.com/search?q=${query}`;
}
