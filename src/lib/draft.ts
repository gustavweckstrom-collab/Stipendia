import { Scholarship } from "@/data/scholarships";
import { StudentProfile } from "@/types/profile";
import { EligibilityResult } from "./eligibility";
import { getLang } from "./i18n";

// A non-templated draft. Builds varying paragraphs each call so two scholarships
// produce visibly different texts.
export function generateDraft(
  profile: StudentProfile,
  scholarship: Scholarship,
  match?: EligibilityResult
): string {
  const en = getLang() === "en";
  const today = new Date().toLocaleDateString(en ? "en-GB" : "sv-SE");
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || (en ? "[Your name]" : "[Ditt namn]");
  const program = profile.program || (en ? "my education" : "min utbildning");
  const universitet = profile.universitet || (en ? "my university" : "mitt lärosäte");
  const termin = profile.termin || (en ? "the current term" : "innevarande termin");
  const syfte = profile.syfte?.trim() || (en ? "develop further within my field" : "vidareutveckla mig inom mitt ämnesområde");
  const engagemang = profile.engagemang?.trim();
  const intressen = profile.intressen?.trim();
  const omDig = profile.omDig?.trim();
  const docs = (profile.uploads ?? []).map((u) => u.documentType);
  const amount = scholarship.amount
    ? `${scholarship.amount.toLocaleString(en ? "en-GB" : "sv-SE")} SEK`
    : en ? "funding" : "stipendiet";

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  if (en) {
    const opens = [
      `My name is ${fullName}, a student of ${program} at ${universitet}, currently in ${termin}.`,
      `I'm ${fullName} and I'm studying ${program} at ${universitet} (${termin}).`,
      `Hello — I'm ${fullName}, in ${termin} of ${program} at ${universitet}.`,
    ];
    const motivations = [
      omDig ? `A bit about me: ${omDig}` : `My academic path has shaped how I approach challenges in ${profile.amnesomrade || "my field"}.`,
      intressen ? `I'm particularly drawn to ${intressen.toLowerCase()}, which guides much of what I work on.` : `I take a curious, hands-on approach to ${profile.amnesomrade || "my field"}.`,
      engagemang ? `Beyond my studies I am engaged in ${engagemang.toLowerCase()}, which has taught me responsibility and collaboration.` : `Outside the classroom I keep building practical skills.`,
    ];
    const fitLine = match && match.reasons.length > 0
      ? `I believe I align with this scholarship because ${match.reasons.slice(0, 2).join("; ").toLowerCase()}.`
      : `I meet the criteria and would like to demonstrate why I'm a suitable candidate.`;
    const docsLine = docs.length > 0 ? ` I'm happy to share my ${docs.join(", ")} if useful.` : "";
    return `${today}

To ${scholarship.organization}

Application for ${scholarship.name}

${pick(opens)}

${pick(motivations)} ${pick(motivations)}

${fitLine} If awarded ${amount}, I would use the support to ${syfte.toLowerCase()}.${docsLine}

Thank you for considering my application.

Best regards,
${fullName}
`;
  }

  const opens = [
    `Mitt namn är ${fullName} och jag studerar ${program} vid ${universitet}, för närvarande ${termin}.`,
    `Jag heter ${fullName}, läser ${program} på ${universitet} och befinner mig i ${termin}.`,
    `Hej, jag är ${fullName} – ${termin} på ${program} vid ${universitet}.`,
  ];
  const motivations = [
    omDig ? `Lite om mig: ${omDig}` : `Min utbildning har format hur jag tar mig an utmaningar inom ${profile.amnesomrade || "mitt ämne"}.`,
    intressen ? `Jag har ett särskilt intresse för ${intressen.toLowerCase()}, vilket genomsyrar mycket av det jag gör.` : `Jag har en nyfiken och konkret inställning till ${profile.amnesomrade || "mitt ämne"}.`,
    engagemang ? `Vid sidan av studierna är jag engagerad i ${engagemang.toLowerCase()}, vilket har lärt mig att ta ansvar och samarbeta.` : `Utanför studierna fortsätter jag bygga praktiska erfarenheter.`,
  ];
  const fitLine = match && match.reasons.length > 0
    ? `Jag bedömer att jag passar väl in på ${scholarship.name} eftersom ${match.reasons.slice(0, 2).join("; ").toLowerCase()}.`
    : `Jag uppfyller stipendiets kriterier och vill med denna ansökan visa varför jag är en lämplig kandidat.`;
  const docsLine = docs.length > 0 ? ` Jag bifogar gärna ${docs.join(", ")} om det är till hjälp.` : "";

  return `${today}

Till ${scholarship.organization}

Ansökan om ${scholarship.name}

${pick(opens)}

${pick(motivations)} ${pick(motivations)}

${fitLine} Om jag tilldelas ${amount} skulle stödet användas till att ${syfte.toLowerCase()}.${docsLine}

Tack för att ni läser min ansökan.

Med vänliga hälsningar,
${fullName}
`;
}
