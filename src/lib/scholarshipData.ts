import { Scholarship, ScholarshipIndex } from "@/data/scholarships";

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

export async function loadScholarshipById(id: string): Promise<Scholarship | null> {
  const index = await loadScholarshipIndex();
  const chunkIndex = chunkIndexForScholarshipId(id, index);
  if (chunkIndex === null) return null;
  const chunk = await loadScholarshipChunk(index.chunks[chunkIndex].file);
  return chunk.find((item) => item.id === id) ?? null;
}

export async function loadScholarshipsByIds(ids: string[]): Promise<Scholarship[]> {
  const index = await loadScholarshipIndex();
  const byChunk = new Map<number, Set<string>>();
  ids.forEach((id) => {
    const chunkIndex = chunkIndexForScholarshipId(id, index);
    if (chunkIndex !== null) {
      if (!byChunk.has(chunkIndex)) byChunk.set(chunkIndex, new Set());
      byChunk.get(chunkIndex)!.add(id);
    }
  });
  const results: Scholarship[] = [];
  await Promise.all(Array.from(byChunk.entries()).map(async ([chunkIndex, idSet]) => {
    const chunk = await loadScholarshipChunk(index.chunks[chunkIndex].file);
    chunk.forEach((item) => {
      if (idSet.has(item.id)) results.push(item);
    });
  }));
  return ids.map((id) => results.find((item) => item.id === id)).filter(Boolean) as Scholarship[];
}

export function externalApplicationUrl(scholarship: Scholarship): string {
  if (scholarship.applicationUrl) return scholarship.applicationUrl;
  const query = encodeURIComponent(`${scholarship.name} stipendium ansökan stiftelse`);
  return `https://www.google.com/search?q=${query}`;
}
