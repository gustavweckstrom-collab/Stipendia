import { describe, expect, it } from "vitest";
import { Scholarship } from "@/data/scholarships";
import { checkEligibility } from "./eligibility";
import { EMPTY_PROFILE, EKONOMI_OPTIONS, StudentProfile } from "@/types/profile";

const baseScholarship: Scholarship = {
  id: "foundation-test",
  name: "Teststiftelsen",
  organization: "Teststiftelsen",
  description: "Stipendium för studenter.",
  targetGroup: ["studenter"],
  requirements: [],
  location: null,
  educationLevel: null,
  fieldOfStudy: [],
  amount: null,
  deadline: null,
  applicationUrl: null,
  source: { name: "test" },
  tags: [],
  criteria: [],
  eligibleUniversities: [],
  eligibleFields: [],
  eligibleLocations: [],
  purposes: [],
};

const profile = (overrides: Partial<StudentProfile> = {}): StudentProfile => ({
  ...EMPTY_PROFILE,
  firstName: "Anna",
  lastName: "Andersson",
  kon: "Kvinna",
  hemort: "Göteborg",
  universitet: "Chalmers tekniska högskola",
  program: "Civilingenjör Datateknik",
  amnesomrade: "Teknik / Ingenjörsvetenskap",
  utbildningsniva: "Kandidatprogram",
  studieort: "Göteborg",
  syfte: "Extra ekonomiskt stöd under studierna",
  ekonomi: EKONOMI_OPTIONS[1],
  ...overrides,
});

describe("checkEligibility", () => {
  it("blocks need-based scholarships when the profile has no economic need", () => {
    const scholarship = { ...baseScholarship, needBased: true };

    const result = checkEligibility(profile({ ekonomi: EKONOMI_OPTIONS[0] }), scholarship);

    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain("Stipendiet är behovsprövat och kräver begränsad ekonomi");
  });

  it("blocks engagement scholarships when engagement is missing", () => {
    const scholarship = { ...baseScholarship, engagementRequired: true };

    const result = checkEligibility(profile({ engagemang: "" }), scholarship);

    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain("Stipendiet kräver föreningsengagemang eller ideellt arbete");
  });

  it("blocks women-in-tech scholarships for non-matching gender", () => {
    const scholarship = { ...baseScholarship, criteria: ["Identifierar sig som kvinna"] };

    const result = checkEligibility(profile({ kon: "Man" }), scholarship);

    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain("Stipendiet riktar sig till sökande som identifierar sig som kvinna");
  });
});
