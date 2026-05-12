import { Scholarship } from "@/data/scholarships";
import { StudentProfile, SYFTE_OPTIONS } from "@/types/profile";
import { ScholarshipType } from "@/types/profile";
import { getLang } from "./i18n";

const norm = (s: string) => s.trim().toLowerCase();
const hasOverlap = (val: string, list: string[]) =>
  list.some((l) => norm(val).includes(norm(l)) || norm(l).includes(norm(val)));
const criteriaText = (s: Scholarship) => norm(s.criteria.join(" "));
const hasEconomicNeed = (profile: StudentProfile) => {
  const economy = norm(profile.ekonomi);
  return economy.includes("begränsad") || economy.includes("svårt") || economy.includes("täcka levnadsomkostnader");
};
const hasEngagement = (profile: StudentProfile) => {
  const engagement = norm(profile.engagemang);
  return engagement.length > 0 && !engagement.includes("nej") && !engagement.includes("inte relevant");
};
const purposeTags = (profile: StudentProfile) =>
  SYFTE_OPTIONS.find((option) => option.value === profile.syfte)?.tags ?? [];

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[]; // matching reasons
  blockers: string[]; // why not eligible
}

export function checkEligibility(profile: StudentProfile, s: Scholarship): EligibilityResult {
  const en = getLang() === "en";
  const reasons: string[] = [];
  const blockers: string[] = [];

  const universities = s.eligibleUniversities ?? [];
  const fields = s.eligibleFields ?? s.fieldOfStudy ?? [];
  const locations = s.eligibleLocations ?? [];

  if (universities.length === 0) {
    reasons.push(en ? "Open to all universities" : "Öppet för alla lärosäten");
  } else if (profile.universitet && hasOverlap(profile.universitet, universities)) {
    reasons.push(en ? `Your university (${profile.universitet}) appears eligible` : `Ditt lärosäte (${profile.universitet}) är behörigt`);
  } else {
    blockers.push(en ? `Only for: ${universities.join(", ")}` : `Endast för: ${universities.join(", ")}`);
  }

  if (fields.length === 0) {
    reasons.push(en ? "Open to all study fields" : "Öppet för alla ämnesområden");
  } else if (
    (profile.amnesomrade && hasOverlap(profile.amnesomrade, fields)) ||
    (profile.program && hasOverlap(profile.program, fields))
  ) {
    reasons.push(en ? `Your study field appears to fit (${fields.join(", ")})` : `Ditt ämnesområde matchar (${fields.join(", ")})`);
  } else {
    blockers.push(en ? `Intended for: ${fields.join(", ")}` : `Riktar sig till: ${fields.join(", ")}`);
  }

  if (locations.length === 0) {
    reasons.push(en ? "No geographic requirements found" : "Inga geografiska krav");
  } else if (
    (profile.studieort && hasOverlap(profile.studieort, locations)) ||
    (profile.hemort && hasOverlap(profile.hemort, locations))
  ) {
    reasons.push(en ? `Study location appears to fit (${locations.join(", ")})` : `Studieort matchar (${locations.join(", ")})`);
  } else {
    blockers.push(en ? `Study location should be: ${locations.join(", ")}` : `Studieort bör vara: ${locations.join(", ")}`);
  }

  if (s.needBased) {
    if (hasEconomicNeed(profile)) {
      reasons.push(en ? "Your financial situation appears to fit need-based scholarships" : "Din ekonomiska situation matchar behovsprövade stipendier");
    } else {
      blockers.push(en ? "The scholarship is need-based and requires limited finances" : "Stipendiet är behovsprövat och kräver begränsad ekonomi");
    }
  }

  if (s.engagementRequired) {
    if (hasEngagement(profile)) {
      reasons.push(en ? "You have added association involvement or volunteer work" : "Du har angett föreningsengagemang eller ideellt arbete");
    } else {
      blockers.push(en ? "The scholarship requires association involvement or volunteer work" : "Stipendiet kräver föreningsengagemang eller ideellt arbete");
    }
  }

  if (criteriaText(s).includes("identifierar sig som kvinna")) {
    if (profile.kon === "Kvinna") {
      reasons.push(en ? "You appear to fit the scholarship's gender criterion" : "Du matchar stipendiets könskriterium");
    } else {
      blockers.push(en ? "The scholarship is intended for applicants who identify as women" : "Stipendiet riktar sig till sökande som identifierar sig som kvinna");
    }
  }

  if (s.purposes && s.purposes.length > 0 && purposeTags(profile).some((tag) => hasOverlap(tag, s.purposes ?? []))) {
    reasons.push(en ? "Your stated purpose appears to fit the foundation's purpose" : "Ditt syfte med stipendiet matchar ändamålet");
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

