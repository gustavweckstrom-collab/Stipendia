import { Scholarship } from "@/data/scholarships";
import { StudentProfile, SYFTE_OPTIONS } from "@/types/profile";
import { ScholarshipType } from "@/types/profile";

const norm = (s: string) => s.trim().toLowerCase();
const hasOverlap = (val: string, list: string[]) =>
  list.some((l) => norm(val).includes(norm(l)) || norm(l).includes(norm(val)));
const criteriaText = (s: Scholarship) => norm(s.criteria.join(" "));
const hasEconomicNeed = (profile: StudentProfile) => {
  const economy = norm(profile.ekonomi);
  return economy.includes("begränsad") || economy.includes("svårt") || economy.includes("täcka levnadsomkostnader");
};
const purposeTags = (profile: StudentProfile) =>
  SYFTE_OPTIONS.find((option) => option.value === profile.syfte)?.tags ?? [];

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[]; // matching reasons
  blockers: string[]; // why not eligible
}

export function checkEligibility(profile: StudentProfile, s: Scholarship): EligibilityResult {
  const reasons: string[] = [];
  const blockers: string[] = [];

  const universities = s.eligibleUniversities ?? [];
  const fields = s.eligibleFields ?? s.fieldOfStudy ?? [];
  const locations = s.eligibleLocations ?? [];

  if (universities.length === 0) {
    reasons.push("Öppet för alla lärosäten");
  } else if (profile.universitet && hasOverlap(profile.universitet, universities)) {
    reasons.push(`Ditt lärosäte (${profile.universitet}) är behörigt`);
  } else {
    blockers.push(`Endast för: ${universities.join(", ")}`);
  }

  if (fields.length === 0) {
    reasons.push("Öppet för alla ämnesområden");
  } else if (
    (profile.amnesomrade && hasOverlap(profile.amnesomrade, fields)) ||
    (profile.program && hasOverlap(profile.program, fields))
  ) {
    reasons.push(`Ditt ämnesområde matchar (${fields.join(", ")})`);
  } else {
    blockers.push(`Riktar sig till: ${fields.join(", ")}`);
  }

  if (locations.length === 0) {
    reasons.push("Inga geografiska krav");
  } else if (
    (profile.studieort && hasOverlap(profile.studieort, locations)) ||
    (profile.hemort && hasOverlap(profile.hemort, locations))
  ) {
    reasons.push(`Studieort matchar (${locations.join(", ")})`);
  } else {
    blockers.push(`Studieort bör vara: ${locations.join(", ")}`);
  }

  if (s.needBased) {
    if (hasEconomicNeed(profile)) {
      reasons.push("Din ekonomiska situation matchar behovsprövade stipendier");
    } else {
      blockers.push("Stipendiet är behovsprövat och kräver begränsad ekonomi");
    }
  }

  if (s.engagementRequired) {
    if (profile.engagemang.trim().length > 0) {
      reasons.push("Du har angett föreningsengagemang eller ideellt arbete");
    } else {
      blockers.push("Stipendiet kräver föreningsengagemang eller ideellt arbete");
    }
  }

  if (criteriaText(s).includes("identifierar sig som kvinna")) {
    if (profile.kon === "Kvinna") {
      reasons.push("Du matchar stipendiets könskriterium");
    } else {
      blockers.push("Stipendiet riktar sig till sökande som identifierar sig som kvinna");
    }
  }

  if (s.purposes && s.purposes.length > 0 && purposeTags(profile).some((tag) => hasOverlap(tag, s.purposes ?? []))) {
    reasons.push("Ditt syfte med stipendiet matchar ändamålet");
  }

  return { eligible: blockers.length === 0, reasons, blockers };
}

export function scholarshipTypes(s: Scholarship): ScholarshipType[] {
  const set = new Set<ScholarshipType>();
  const purposes = (s.purposes ?? []).map((p) => p.toLowerCase());
  const text = (s.description + " " + (s.tags ?? []).join(" ") + " " + (s.fieldOfStudy ?? []).join(" ")).toLowerCase();
  const has = (k: string) => purposes.some((p) => p.includes(k)) || text.includes(k);
  if (has("utbyte") || has("utlands") || has("resor")) set.add("Utlandsstudier");
  if (has("examensarbete") || has("uppsats")) set.add("Examensarbete");
  if (has("praktik")) set.add("Praktik");
  if (has("forskning") || has("projekt")) set.add("Forskning");
  if (
    has("levnadskost") || has("hyra") || has("kurslitteratur") ||
    has("fritt") || has("kompetensutveckling") || has("kursavgift") || s.needBased
  )
    set.add("Ekonomiskt stöd");
  if (set.size === 0) set.add("Ekonomiskt stöd");
  return Array.from(set);
}

export type DeadlineState = "open-not-applied" | "open-applied" | "closed" | "unknown";

export function deadlineState(s: Scholarship, applied: boolean): DeadlineState {
  if (!s.deadline) return "unknown";
  const now = Date.now();
  const open = new Date(s.deadline).getTime() >= now;
  if (!open) return "closed";
  return applied ? "open-applied" : "open-not-applied";
}
