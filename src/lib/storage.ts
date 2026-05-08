import { StudentProfile, SavedApplication, ApplicationStatus, DOC_TYPES } from "@/types/profile";

type StoredUpload = { documentType?: unknown };

const KEYS = {
  profile: "stipendia.profile",
  saved: "stipendia.saved",
  drafts: "stipendia.drafts",
  applied: "stipendia.applied",
  notifs: "stipendia.notifs",
  lang: "stipendia.lang",
};

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
    delete p.bakgrund;
    // migrate old ekonomiKommentar -> omDig
    if (p.ekonomiKommentar && !p.omDig) p.omDig = p.ekonomiKommentar;
    delete p.ekonomiKommentar;
    if (!p.utbildningsniva) {
      const oldTerm = String(p.termin ?? "").toLowerCase();
      if (oldTerm.includes("doktor")) p.utbildningsniva = "Doktorand/forskningsnivå";
      else if (oldTerm.includes("master")) p.utbildningsniva = "Avancerad nivå";
      else p.utbildningsniva = "";
    }
    if (!Array.isArray(p.uploads)) p.uploads = [];
    const allowedDocTypes = new Set(DOC_TYPES.map(({ k }) => k));
    p.uploads = (p.uploads as StoredUpload[]).filter((u) => typeof u.documentType === "string" && allowedDocTypes.has(u.documentType as any));
    if (p.dokument && typeof p.dokument === "object") {
      const existingTypes = new Set((p.uploads as StoredUpload[]).map((u) => u.documentType));
      DOC_TYPES.forEach(({ k, label }) => {
        if (p.dokument[k] && !existingTypes.has(k)) {
          p.uploads.push({
            documentType: k,
            fileName: `${label} tillagt`,
            uploadDate: new Date().toISOString(),
          });
        }
      });
    }
    return p;
  } catch { return null; }
}

export function saveProfile(p: StudentProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(p));
  window.dispatchEvent(new Event("stipendia:update"));
}

export function clearProfile() {
  localStorage.removeItem(KEYS.profile);
  window.dispatchEvent(new Event("stipendia:update"));
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
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

/* applied (markera som sökt) */
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

export function loadDrafts(): SavedApplication[] {
  try {
    const raw = localStorage.getItem(KEYS.drafts);
    if (!raw) return [];
    const list = JSON.parse(raw) as any[];
    return list.map((d) => ({
      status: "utkast" as ApplicationStatus,
      createdAt: d.createdAt ?? d.updatedAt ?? new Date().toISOString(),
      updatedAt: d.updatedAt ?? new Date().toISOString(),
      scholarshipId: d.scholarshipId,
      scholarshipName: d.scholarshipName,
      text: d.text ?? "",
    }));
  } catch { return []; }
}

export function saveDraft(draft: Omit<SavedApplication, "createdAt" | "status"> & Partial<Pick<SavedApplication, "createdAt" | "status">>) {
  const cur = loadDrafts();
  const existing = cur.find((d) => d.scholarshipId === draft.scholarshipId);
  const next: SavedApplication = {
    scholarshipId: draft.scholarshipId,
    scholarshipName: draft.scholarshipName,
    text: draft.text,
    status: "utkast",
    createdAt: existing?.createdAt ?? draft.createdAt ?? new Date().toISOString(),
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  };
  const others = cur.filter((d) => d.scholarshipId !== draft.scholarshipId);
  others.push(next);
  localStorage.setItem(KEYS.drafts, JSON.stringify(others));
  window.dispatchEvent(new Event("stipendia:update"));
}

export function setApplicationStatus(_id: string, _s: ApplicationStatus) { /* noop kept for backcompat */ }

export function deleteDraft(scholarshipId: string) {
  const cur = loadDrafts().filter((d) => d.scholarshipId !== scholarshipId);
  localStorage.setItem(KEYS.drafts, JSON.stringify(cur));
  window.dispatchEvent(new Event("stipendia:update"));
}
