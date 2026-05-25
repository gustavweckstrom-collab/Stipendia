import { Scholarship } from "@/data/scholarships";
import { StudentProfile, SYFTE_OPTIONS } from "@/types/profile";
import { ScholarshipType } from "@/types/profile";
import { getLang } from "./i18n";
import { normalizeText, scholarshipMatchesEducationLevel, scholarshipMatchesSearchValue } from "./scholarshipData";

const norm = (s: string) => normalizeText(s);
const hasOverlap = (val: string, list: string[]) =>
  list.some((l) => norm(val).includes(norm(l)) || norm(l).includes(norm(val)));
const criteriaText = (s: Scholarship) => norm([s.description, ...(s.requirements ?? []), ...(s.criteria ?? []), ...(s.targetGroup ?? []), ...(s.tags ?? [])].join(" "));
const hasAny = (text: string, words: string[]) => words.some((word) => text.includes(norm(word)));
const hasEconomicNeed = (profile: StudentProfile) => {
  const economy = norm(profile.ekonomi);
  return economy.includes("begransad") || economy.includes("svart") || economy.includes("tacka levnadsomkostnader");
};
const hasEngagement = (profile: StudentProfile) => {
  const engagement = norm(profile.engagemang);
  return engagement.length > 0 && !engagement.includes("nej") && !engagement.includes("inte relevant");
};
const hasPreviousEngagement = (profile: StudentProfile) => norm(profile.engagemang).includes("tidigare aktiv");
const purposeTags = (profile: StudentProfile) =>
  profile.syfte.flatMap((value) => SYFTE_OPTIONS.find((option) => option.value === value)?.tags ?? []);

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[]; // matching reasons
  review: string[]; // information that should be checked with the foundation
  blockers: string[]; // why not eligible
}

export type EligibilityState = "eligible" | "review" | "not-eligible";

export function eligibilityState(result: EligibilityResult): EligibilityState {
  const blockers = result.blockers ?? [];
  const reasons = result.reasons ?? [];
  const review = result.review ?? [];
  if (blockers.length > 0) return "not-eligible";
  if (reasons.length >= 2 && review.length <= 1) return "eligible";
  return "review";
}

export function checkEligibility(profile: StudentProfile, s: Scholarship): EligibilityResult {
  const en = getLang() === "en";
  const reasons: string[] = [];
  const review: string[] = [];
  const blockers: string[] = [];
  const text = criteriaText(s);

  const universities = s.eligibleUniversities ?? [];
  const fields = s.eligibleFields ?? s.fieldOfStudy ?? [];
  const locations = s.eligibleLocations ?? [];

  if (universities.length === 0) {
    if (hasAny(text, ["samtliga universitet", "universitet eller högskola", "universitet och högskolor", "universitetsstudier", "högre utbildning"])) {
      reasons.push(en ? "Aimed at university or college students" : "Riktar sig till universitets- eller högskolestudenter");
    } else {
      review.push(en ? "University requirement should be checked" : "Lärosäteskrav behöver kontrolleras");
    }
  } else if (profile.universitet && hasOverlap(profile.universitet, universities)) {
    reasons.push(en ? `Your university (${profile.universitet}) appears to fit` : `Ditt lärosäte (${profile.universitet}) verkar passa`);
  } else {
    blockers.push(en ? `Only for: ${universities.join(", ")}` : `Endast för: ${universities.join(", ")}`);
  }

  if (fields.length === 0) {
    review.push(en ? "Study field requirement is unclear" : "Ämneskrav behöver kontrolleras");
  } else if (
    (profile.amnesomrade.some((field) => hasOverlap(field, fields))) ||
    (profile.program && hasOverlap(profile.program, fields))
  ) {
    reasons.push(en ? `Your study field appears to fit (${fields.join(", ")})` : `Ditt ämnesområde verkar passa (${fields.join(", ")})`);
  } else {
    blockers.push(en ? `Intended for: ${fields.join(", ")}` : `Riktar sig till: ${fields.join(", ")}`);
  }

  if (locations.length === 0) {
    const geoValues = [profile.hemort, profile.studieort, profile.universitet].filter(Boolean);
    const geoHit = geoValues.find((value) => scholarshipMatchesSearchValue(s, value));
    if (geoHit) {
      reasons.push(en ? `Possible geographic connection: ${geoHit}` : `Möjlig geografisk anknytning: ${geoHit}`);
    } else if (hasAny(text, ["född", "bosatt", "hemmahörande", "anknytning", "kommun", "län", "nation"])) {
      review.push(en ? "Geographic requirement should be checked" : "Geografisk anknytning behöver kontrolleras");
    }
  } else if (
    (profile.studieort && hasOverlap(profile.studieort, locations)) ||
    (profile.hemort && hasOverlap(profile.hemort, locations)) ||
    (profile.universitet && hasOverlap(profile.universitet, locations))
  ) {
    reasons.push(en ? `Geographic connection appears to fit (${locations.join(", ")})` : `Geografisk anknytning verkar passa (${locations.join(", ")})`);
  } else {
    blockers.push(en ? `Geographic connection should be: ${locations.join(", ")}` : `Geografisk anknytning bör vara: ${locations.join(", ")}`);
  }

  if (profile.utbildningsniva) {
    if (scholarshipMatchesEducationLevel(s, profile.utbildningsniva)) {
      reasons.push(en ? `Education level appears to fit (${profile.utbildningsniva})` : `Utbildningsnivå verkar passa (${profile.utbildningsniva})`);
    } else if (hasAny(text, ["doktorand", "forskarutbildning", "forskningsnivå", "forskare", "forskningsprojekt"])) {
      blockers.push(en ? "Appears aimed at doctoral or research level" : "Verkar rikta sig till doktorand- eller forskningsnivå");
    } else {
      review.push(en ? "Education level should be checked" : "Utbildningsnivå behöver kontrolleras");
    }
  }

  if (s.needBased) {
    if (hasEconomicNeed(profile)) {
      reasons.push(en ? "Your financial situation appears to fit need-based scholarships" : "Din ekonomiska situation verkar passa behovsprövade stipendier");
    } else {
      blockers.push(en ? "The scholarship is need-based and requires limited finances" : "Stipendiet är behovsprövat och kräver begränsad ekonomi");
    }
  }

  if (s.engagementRequired) {
    if (hasPreviousEngagement(profile)) {
      review.push(en ? "Previous association involvement may be relevant but should be checked" : "Tidigare föreningsengagemang kan vara relevant men behöver kontrolleras");
    } else if (hasEngagement(profile)) {
      reasons.push(en ? "You have added association involvement or volunteer work" : "Du har angett föreningsengagemang eller ideellt arbete");
    } else {
      blockers.push(en ? "The scholarship requires association involvement or volunteer work" : "Stipendiet kräver föreningsengagemang eller ideellt arbete");
    }
  }

  if (criteriaText(s).includes("identifierar sig som kvinna")) {
    if (profile.kon === "Kvinna") {
      reasons.push(en ? "You appear to fit the scholarship's gender criterion" : "Du verkar passa stipendiets könskriterium");
    } else {
      blockers.push(en ? "The scholarship is intended for applicants who identify as women" : "Stipendiet riktar sig till sökande som identifierar sig som kvinna");
    }
  }

  if (s.purposes && s.purposes.length > 0 && purposeTags(profile).some((tag) => hasOverlap(tag, s.purposes ?? []))) {
    reasons.push(en ? "Your stated purpose appears to fit the foundation's purpose" : "Ditt syfte med stipendiet verkar passa ändamålet");
  }

  if (hasAny(text, ["gymnasieelev", "grundskoleelev", "postdok", "postdoc", "professor"]) && !hasAny(text, ["universitet", "högskola", "studerande vid universitet", "studerande vid högskola"])) {
    blockers.push(en ? "Appears aimed at another target group" : "Verkar rikta sig till en annan målgrupp");
  }

  const result: EligibilityResult = { eligible: false, reasons, review, blockers };
  result.eligible = eligibilityState(result) === "eligible";
  return result;
}

export function scholarshipTypes(s: Scholarship): ScholarshipType[] {
  const set = new Set<ScholarshipType>();
  const purposes = (s.purposes ?? []).map((p) => p.toLowerCase());
  const text = (s.description + " " + (s.requirements ?? []).join(" ") + " " + (s.tags ?? []).join(" ") + " " + (s.fieldOfStudy ?? []).join(" ")).toLowerCase();
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

