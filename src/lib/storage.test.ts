import { beforeEach, describe, expect, it } from "vitest";
import { DOC_TYPES, EMPTY_PROFILE } from "@/types/profile";
import { loadProfile } from "./storage";

describe("profile storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps profile document uploads focused on draft-writing documents", () => {
    expect(DOC_TYPES.map((doc) => doc.k)).toEqual(["cv", "personligtBrev", "rekommendationsbrev", "andra"]);
  });

  it("migrates only supported legacy document flags into uploads", () => {
    localStorage.setItem("stipendia.profile", JSON.stringify({
      ...EMPTY_PROFILE,
      dokument: { cv: true },
      uploads: [{ documentType: "legacyUnsupported", fileName: "old.pdf", uploadDate: new Date().toISOString() }],
    }));

    const loaded = loadProfile();

    expect(loaded?.uploads?.map((upload) => upload.documentType)).toEqual(
      ["cv"]
    );
  });
});
