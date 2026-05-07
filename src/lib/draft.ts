import { Scholarship } from "@/data/scholarships";
import { StudentProfile, DOC_TYPES } from "@/types/profile";
import { EligibilityResult } from "./eligibility";
import { getLang, optionLabel } from "./i18n";

const sentence = (value?: string | null) => value?.trim().replace(/\s+/g, " ") ?? "";
const shortText = (value: string, max = 280) => value.length > max ? `${value.slice(0, max).trim()}...` : value;

function uploadedDocumentLabels(profile: StudentProfile, lang: "sv" | "en") {
  return (profile.uploads ?? [])
    .map((u) => DOC_TYPES.find((d) => d.k === u.documentType)?.label ?? u.documentType)
    .map((label) => optionLabel(lang, label));
}

export function generateDraft(
  profile: StudentProfile,
  scholarship: Scholarship,
  eligibility?: EligibilityResult
): string {
  const lang = getLang();
  const en = lang === "en";
  const today = new Date().toLocaleDateString(en ? "en-GB" : "sv-SE");
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || (en ? "[Your name]" : "[Ditt namn]");
  const program = sentence(profile.program) || (en ? "my programme" : "min utbildning");
  const university = sentence(profile.universitet) || (en ? "my university" : "mitt lärosäte");
  const term = sentence(profile.termin);
  const field = sentence(profile.amnesomrade);
  const purpose = sentence(profile.syfte);
  const engagement = sentence(profile.engagemang);
  const interests = sentence(profile.intressen);
  const about = sentence(profile.omDig);
  const documents = uploadedDocumentLabels(profile, lang);
  const requirements = [
    ...(scholarship.criteria ?? []),
    ...(scholarship.requirements ?? []),
  ].filter(Boolean);
  const scholarshipPurpose = shortText(sentence(scholarship.description), 320);
  const reasons = eligibility?.reasons.slice(0, 3) ?? [];
  const blockers = eligibility?.blockers.slice(0, 2) ?? [];

  if (en) {
    const studyLine = term
      ? `I am currently in ${optionLabel(lang, term).toLowerCase()} of ${program} at ${university}.`
      : `I am studying ${program} at ${university}.`;
    const personalParts = [
      about && `A short personal note about me: ${about}`,
      field && `My academic focus is ${optionLabel(lang, field).toLowerCase()}.`,
      interests && `I am especially interested in ${interests.toLowerCase()}.`,
      engagement && `Alongside my studies, I have been involved in ${engagement.toLowerCase()}.`,
    ].filter(Boolean);
    const fitLine = reasons.length > 0
      ? `Based on the information I have provided, I appear to fit the scholarship because ${reasons.join("; ").toLowerCase()}.`
      : `Based on the available information, I would like to show why my studies and background are relevant to this scholarship.`;
    const cautionLine = blockers.length > 0
      ? `I will also verify the following requirements before submitting: ${blockers.join("; ").toLowerCase()}.`
      : "";
    const docsLine = documents.length > 0
      ? `I have also added ${documents.join(", ")} in Stipendia so the draft can reflect my background, experience and merits more accurately.`
      : `I have not added supporting documents yet, so I will review the draft carefully and add concrete examples before submitting.`;

    return `${today}

To ${scholarship.organization || scholarship.name}

Application for ${scholarship.name}

My name is ${fullName}. ${studyLine}

${personalParts.length > 0 ? personalParts.join(" ") : "I want my application to reflect my studies, motivation and future goals without adding facts that are not in my profile."}

${scholarshipPurpose ? `I am applying because the foundation's purpose appears relevant to my situation: ${scholarshipPurpose}` : `I am applying because this foundation appears relevant to students with my background and goals.`}

${fitLine} ${purpose ? `My main reason for applying is ${optionLabel(lang, purpose).toLowerCase()}, and I want the application to connect that purpose clearly to the foundation's requirements.` : `I will adapt the final application to the foundation's current requirements.`} ${cautionLine}

${docsLine}

Thank you for considering my application.

Best regards,
${fullName}
`;
  }

  const studyLine = term
    ? `Jag läser ${program} vid ${university} och befinner mig i ${optionLabel(lang, term).toLowerCase()}.`
    : `Jag läser ${program} vid ${university}.`;
  const personalParts = [
    about && `Lite kort om mig: ${about}`,
    field && `Min utbildning är inriktad mot ${optionLabel(lang, field).toLowerCase()}.`,
    interests && `Jag är särskilt intresserad av ${interests.toLowerCase()}.`,
    engagement && `Vid sidan av studierna har jag engagerat mig i ${engagement.toLowerCase()}.`,
  ].filter(Boolean);
  const fitLine = reasons.length > 0
    ? `Utifrån uppgifterna i min profil verkar jag passa stipendiet eftersom ${reasons.join("; ").toLowerCase()}.`
    : `Utifrån den information som finns vill jag visa varför mina studier och min bakgrund är relevanta för stipendiet.`;
  const cautionLine = blockers.length > 0
    ? `Jag kommer också att kontrollera följande krav innan jag skickar in ansökan: ${blockers.join("; ").toLowerCase()}.`
    : "";
  const docsLine = documents.length > 0
    ? `Jag har även lagt till ${documents.join(", ")} i Stipendia så att utkastet kan spegla min bakgrund, mina erfarenheter och mina meriter tydligare.`
    : `Jag har ännu inte lagt till några dokument, så jag kommer att läsa igenom utkastet extra noggrant och lägga till konkreta exempel innan ansökan skickas.`;

  return `${today}

Till ${scholarship.organization || scholarship.name}

Ansökan om ${scholarship.name}

Mitt namn är ${fullName}. ${studyLine}

${personalParts.length > 0 ? personalParts.join(" ") : "Jag vill att min ansökan ska spegla mina studier, min drivkraft och mina mål utan att lägga till uppgifter som inte finns i min profil."}

${scholarshipPurpose ? `Jag söker eftersom stiftelsens ändamål verkar relevant för min situation: ${scholarshipPurpose}` : `Jag söker eftersom stiftelsen verkar relevant för studenter med min bakgrund och mina mål.`}

${fitLine} ${purpose ? `Mitt huvudsakliga skäl till att söka är ${optionLabel(lang, purpose).toLowerCase()}, och jag vill att ansökan tydligt kopplar detta till stiftelsens krav.` : `Jag kommer att anpassa den slutliga ansökan efter stiftelsens aktuella krav.`} ${cautionLine}

${docsLine}

Tack för att ni tar er tid att läsa min ansökan.

Med vänliga hälsningar,
${fullName}
`;
}
