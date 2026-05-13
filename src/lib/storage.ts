import { StudentProfile } from "@/types/profile";

const KEYS = {
  profile: "stipendia.profile",
  saved: "stipendia.saved",
  applied: "stipendia.applied",
  notifs: "stipendia.notifs",
  lang: "stipendia.lang",
  deadlines: "stipendia.deadlines",
};

const LEGACY_KEYS = ["stipendia.drafts"];

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeFieldValues(value: unknown): string[] {
  return uniqueStrings(toStringArray(value).map((item) => item === "Annat" ? "Annat / osäker" : item));
}

function normalizePurposeValues(value: unknown): string[] {
  const legacyMap: Record<string, string[]> = {
    "Extra ekonomiskt stöd under studierna": ["Ekonomiskt stöd"],
    "Utlandsstudier eller utbyte": ["Utlandsstudier"],
    "Studieresa": ["Resa"],
    "Kursavgift eller utbildningskostnader": ["Studiekostnader", "Material/litteratur"],
    "Boende eller levnadsomkostnader": ["Ekonomiskt stöd"],
    "Forskningsprojekt": ["Annat"],
  };

  return uniqueStrings(toStringArray(value).flatMap((item) => legacyMap[item] ?? [item]));
}

function stripLegacyProfileFields(p: any): StudentProfile {
  delete p.bakgrund;
  delete p.dokument;
  delete p.uploads;
  delete p.ekonomiKommentar;
  p.amnesomrade = normalizeFieldValues(p.amnesomrade);
  p.syfte = normalizePurposeValues(p.syfte);
  return p as StudentProfile;
}

export function loadProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.profile);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && p.namn && !p.firstName) {
      const parts = String(p.namn).trim().split(/\s+/);
      p.firstName = parts.shift() ?? "";
      p.lastName = parts.join(" ");
      delete p.namn;
    }
    if (p.ekonomiKommentar && !p.omDig) p.omDig = p.ekonomiKommentar;
    if (!p.utbildningsniva) {
      const oldTerm = String(p.termin ?? "").toLowerCase();
      if (oldTerm.includes("doktor")) p.utbildningsniva = "Doktorand/forskningsnivå";
      else if (oldTerm.includes("master")) p.utbildningsniva = "Avancerad nivå";
      else p.utbildningsniva = "";
    }
    if (p.utbildningsniva === "Fristående kurs" || p.utbildningsniva === "Kandidatprogram" || p.utbildningsniva === "Grundnivå / avancerad nivå") p.utbildningsniva = "Grundnivå";
    if (p.utbildningsniva === "Masterprogram") p.utbildningsniva = "Avancerad nivå";
    if (String(p.utbildningsniva ?? "").toLowerCase().includes("doktor")) p.utbildningsniva = "";
    return stripLegacyProfileFields(p);
  } catch { return null; }
}

export function saveProfile(p: StudentProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(stripLegacyProfileFields({ ...p })));
  window.dispatchEvent(new Event("stipendia:update"));
}

export function clearProfile() {
  localStorage.removeItem(KEYS.profile);
  window.dispatchEvent(new Event("stipendia:update"));
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event("stipendia:update"));
  window.dispatchEvent(new Event("stipendia:lang"));
}

export function loadSavedIds(): string[] {
  try { const raw = localStorage.getItem(KEYS.saved); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function toggleSaved(id: string): string[] {
  const cur = loadSavedIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(KEYS.saved, JSON.stringify(next));
  window.dispatchEvent(new Event("stipendia:update"));
  return next;
}

export function loadAppliedIds(): string[] {
  try { const raw = localStorage.getItem(KEYS.applied); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function isApplied(id: string): boolean { return loadAppliedIds().includes(id); }

export function toggleApplied(id: string): string[] {
  const cur = loadAppliedIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(KEYS.applied, JSON.stringify(next));
  window.dispatchEvent(new Event("stipendia:update"));
  return next;
}

export type PersonalDeadline = {
  date: string;
  reminderDays: 1 | 3 | 7 | null;
};

function isPersonalDeadline(value: unknown): value is PersonalDeadline {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PersonalDeadline>;
  return typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date);
}

export function loadPersonalDeadlines(): Record<string, PersonalDeadline> {
  try {
    const raw = localStorage.getItem(KEYS.deadlines);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, PersonalDeadline] => typeof entry[0] === "string" && isPersonalDeadline(entry[1]))
        .map(([id, item]) => [id, {
          date: item.date,
          reminderDays: item.reminderDays === 1 || item.reminderDays === 3 || item.reminderDays === 7 ? item.reminderDays : null,
        }])
    );
  } catch { return {}; }
}

export function loadPersonalDeadline(id: string): PersonalDeadline | null {
  return loadPersonalDeadlines()[id] ?? null;
}

export function savePersonalDeadline(id: string, deadline: PersonalDeadline): Record<string, PersonalDeadline> {
  const next = { ...loadPersonalDeadlines(), [id]: deadline };
  localStorage.setItem(KEYS.deadlines, JSON.stringify(next));
  window.dispatchEvent(new Event("stipendia:update"));
  return next;
}

export function removePersonalDeadline(id: string): Record<string, PersonalDeadline> {
  const next = { ...loadPersonalDeadlines() };
  delete next[id];
  localStorage.setItem(KEYS.deadlines, JSON.stringify(next));
  window.dispatchEvent(new Event("stipendia:update"));
  return next;
}
