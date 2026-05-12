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
    .replace(/\baf\b/g, "av")
    .replace(/\buti\b/g, "i")
    .replace(/inskrifven/g, "inskriven")
    .replace(/behoefvande|beho fvande/g, "behovande")
    .replace(/behof/g, "behov")
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

type SearchRelation = {
  base: string;
  related: string[];
  reasonSv: (hit: string) => string;
  reasonEn: (hit: string) => string;
};

const STRICT_SEARCH_TERMS = new Set(["gotland"]);
const SEARCH_WORD_CHARS = "a-z0-9";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWordLikeMatch(text: string, term: string): boolean {
  const escaped = escapeRegExp(term);
  const pattern = new RegExp(`(^|[^${SEARCH_WORD_CHARS}])${escaped}s?(?=$|[^${SEARCH_WORD_CHARS}])`);
  return pattern.test(text);
}

function textMatchesSearchTerm(text: string, term: string): boolean {
  if (!term) return false;
  if (STRICT_SEARCH_TERMS.has(term)) return hasWordLikeMatch(text, term);
  return text.includes(term);
}

// Small, explicit search-only geography map. It broadens search results without
// claiming that the scholarship text contains these places as formal requirements.
const GEOGRAPHIC_SEARCH_RELATIONS: SearchRelation[] = [
  {
    base: "Göteborg",
    related: ["Chalmers", "Chalmers tekniska högskola", "Göteborgs universitet", "Västra Götaland", "Göteborgs och Bohus län"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Göteborg.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Gothenburg.`,
  },
  {
    base: "Stockholm",
    related: ["Stockholms universitet", "Kungliga Tekniska högskolan", "KTH", "Karolinska institutet", "Solna", "Handelshögskolan i Stockholm"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Stockholm.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Stockholm.`,
  },
  {
    base: "Uppsala",
    related: ["Uppsala universitet", "Uppsala Akademiförvaltning"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Uppsala.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Uppsala.`,
  },
  {
    base: "Lund",
    related: ["Lunds universitet"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Lund.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Lund.`,
  },
  {
    base: "Linköping",
    related: ["Linköpings universitet"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Linköping.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Linköping.`,
  },
  {
    base: "Umeå",
    related: ["Umeå universitet"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Umeå.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Umeå.`,
  },
  {
    base: "Örebro",
    related: ["Örebro universitet"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Örebro.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Örebro.`,
  },
  {
    base: "Gotland",
    related: ["Gotlands län", "Region Gotland", "Visby"],
    reasonSv: (hit) => `Visas genom geografisk koppling mellan ${hit} och Gotland.`,
    reasonEn: (hit) => `Shown through the geographic connection between ${hit} and Gotland.`,
  },
];

function uniqueNormalizedTerms(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}

export function expandSearchTerms(value: string | null | undefined): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const terms = [value ?? ""];
  for (const relation of GEOGRAPHIC_SEARCH_RELATIONS) {
    const base = normalizeText(relation.base);
    const related = relation.related.map(normalizeText);
    if (textMatchesSearchTerm(normalized, base)) terms.push(...relation.related);
    if (related.some((term) => textMatchesSearchTerm(normalized, term))) terms.push(relation.base);
  }
  return uniqueNormalizedTerms(terms);
}

export function scholarshipSearchHaystack(scholarship: Scholarship): string {
  return normalizeText(scholarshipSearchFields(scholarship).join(" "));
}

export function scholarshipMatchesSearchValue(scholarship: Scholarship, value: string | null | undefined): boolean {
  const terms = expandSearchTerms(value);
  if (terms.length === 0) return true;
  const haystack = scholarshipSearchHaystack(scholarship);
  return terms.some((term) => textMatchesSearchTerm(haystack, term));
}

export function scholarshipSearchRelationReasons(scholarship: Scholarship, value: string | null | undefined): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const haystack = scholarshipSearchHaystack(scholarship);
  const en = getLang() === "en";
  const reasons: string[] = [];
  for (const relation of GEOGRAPHIC_SEARCH_RELATIONS) {
    const base = normalizeText(relation.base);
    if (!textMatchesSearchTerm(normalized, base)) continue;
    if (textMatchesSearchTerm(haystack, base)) {
      reasons.push(en ? `Mentions ${relation.base}.` : `Texten nämner ${relation.base}.`);
      continue;
    }
    for (const related of relation.related) {
      const relatedNormalized = normalizeText(related);
      if (textMatchesSearchTerm(haystack, relatedNormalized) && !textMatchesSearchTerm(haystack, base)) {
        reasons.push(en ? relation.reasonEn(related) : relation.reasonSv(related));
        break;
      }
    }
  }
  return Array.from(new Set(reasons));
}

const LOWER_PLACE_WORDS = new Set(["län", "kommun", "stad", "region", "församling"]);

function titleCasePlace(value: string): string {
  return value
    .toLocaleLowerCase("sv-SE")
    .split(/(\s+|-)/)
    .map((part, index) => {
      if (/^\s+$|^-$/u.test(part)) return part;
      if (index > 0 && LOWER_PLACE_WORDS.has(part)) return part;
      return part.charAt(0).toLocaleUpperCase("sv-SE") + part.slice(1);
    })
    .join("");
}

function cleanLabel(value: string | null | undefined): string {
  const text = (value ?? "").replace(/_x000D_/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text === text.toLowerCase() ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function formatPlaceLabel(value: string | null | undefined): string | null {
  const text = cleanLabel(value);
  if (!text) return null;
  const letters = text.replace(/[^A-Za-zÅÄÖåäö]/g, "");
  const looksAllCaps = letters.length > 1 && letters === letters.toLocaleUpperCase("sv-SE");
  const looksAllLower = letters.length > 1 && letters === letters.toLocaleLowerCase("sv-SE");
  return looksAllCaps || looksAllLower ? titleCasePlace(text) : text;
}

export function scholarshipLocationLabel(scholarship: Scholarship): string | null {
  return formatPlaceLabel(scholarship.location || scholarship.source?.city || null);
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

export function scholarshipMatchesTravel(scholarship: Scholarship): boolean {
  const text = normalizeText([
    scholarship.name,
    scholarship.description,
    ...(scholarship.criteria ?? []),
    ...(scholarship.tags ?? []),
    ...(scholarship.purposes ?? []),
  ].join(" "));
  return hasText(text, [
    "resa",
    "resestipendium",
    "resestipendier",
    "utlandsstudier",
    "studier utomlands",
    "studieresa",
    "praktik utomlands",
    "utbyte",
    "utbytesstudier",
    "fältstudier",
    "faltstudier",
  ]);
}

export function scholarshipMatchesStudyAbroad(scholarship: Scholarship): boolean {
  const text = normalizeText([
    scholarship.name,
    scholarship.description,
    ...(scholarship.criteria ?? []),
    ...(scholarship.tags ?? []),
    ...(scholarship.purposes ?? []),
  ].join(" "));
  return hasText(text, ["utlandsstudier", "studier utomlands", "utbyte", "utbytesstudier", "exchange", "abroad"]);
}

// Search spans names, long descriptions, eligibility text, geography and
// structured categories. Filtering scans chunks gradually, and pages render
// 50 cards at a time so older phones do not need to paint the whole dataset.
export function scholarshipSearchFields(scholarship: Scholarship): string[] {
  return [
    scholarship.name,
    scholarship.organization,
    scholarship.description,
    scholarship.descriptionEn ?? "",
    scholarship.location ?? "",
    scholarship.source?.city ?? "",
    scholarship.source?.address ?? "",
    ...(scholarship.requirements ?? []),
    ...(scholarship.criteria ?? []),
    ...(scholarship.targetGroup ?? []),
    ...(scholarship.tags ?? []),
    ...(scholarship.fieldOfStudy ?? []),
    ...(scholarship.eligibleFields ?? []),
    ...(scholarship.eligibleUniversities ?? []),
    ...(scholarship.eligibleLocations ?? []),
    ...(scholarship.purposes ?? []),
  ];
}

export function scholarshipMatchesEducationLevel(scholarship: Scholarship, level: string): boolean {
  const normalizedLevel = normalizeText(level);
  if (!normalizedLevel) return true;
  const text = normalizeText([
    scholarship.educationLevel,
    scholarship.name,
    scholarship.description,
    ...(scholarship.criteria ?? []),
    ...(scholarship.tags ?? []),
  ].join(" "));
  const doctoralMatch = hasText(text, ["doktorand", "doktorander", "forskarutbildning", "forskningsnivå", "forskningsniva", "forskning", "forskningsprojekt"]);
  if (normalizedLevel.includes("doktor")) return doctoralMatch;
  if (normalizedLevel.includes("frist")) return !doctoralMatch && hasText(text, ["kurs", "utbildning", "studier", "universitet", "högskola", "hogskola", "studerande", "student"]);
  if (normalizedLevel.includes("kandidat")) return !doctoralMatch && hasText(text, ["kandidat", "bachelor", "grundnivå", "grundniva", "grundutbildning", "universitet", "högskola", "hogskola", "studerande", "student"]);
  if (normalizedLevel.includes("master")) return !doctoralMatch && hasText(text, ["master", "magister", "avancerad nivå", "avancerad niva", "universitet", "högskola", "hogskola", "studerande", "student"]);
  if (normalizedLevel.includes("grund") && normalizedLevel.includes("avancerad")) return !doctoralMatch;
  if (normalizedLevel.includes("avancerad")) return hasText(text, ["avancerad nivå", "avancerad niva", "master", "magister"]);
  return hasText(text, ["grundnivå", "grundniva", "kandidat", "bachelor", "grundutbildning", "universitet", "högskola", "hogskola", "studerande", "student"]);
}

export function externalApplicationUrl(scholarship: Scholarship): string {
  const directUrl = applicationTargetUrl(scholarship);
  if (directUrl) return directUrl;
  const query = encodeURIComponent(`${scholarship.name} stipendium ansökan`);
  return `https://www.google.com/search?q=${query}`;
}
