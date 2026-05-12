export interface StudentProfile {
  firstName: string;
  lastName: string;
  universitet: string;
  program: string;
  amnesomrade: string;
  termin?: string;
  utbildningsniva: string;
  studieort: string;
  hemort: string;
  kon: string;
  ekonomi: string;
  /** Optional free-text "om dig" */
  omDig?: string;
  engagemang: string;
  intressen: string;
  syfte: string;
  syfteAnnan?: string;
}

export const PROGRAM_SUGGESTIONS_BY_UNIVERSITY: Record<string, string[]> = {
  "Göteborgs universitet": [
    "Systemvetenskap: samhällets digitalisering",
    "Ekonomie kandidatprogram",
    "Juristprogrammet",
    "Läkarprogrammet",
    "Kandidatprogram i globala studier",
  ],
  "Chalmers tekniska högskola": [
    "Civilingenjör Datateknik",
    "Civilingenjör Teknisk fysik",
    "Civilingenjör Industriell ekonomi",
    "Arkitektur",
    "Sjöingenjörsprogrammet",
  ],
  "Stockholms universitet": [
    "Kandidatprogram i data- och systemvetenskap",
    "Ekonomprogrammet",
    "Juristprogrammet",
    "Kandidatprogram i samhällsvetenskap",
    "Masterprogram i folkhälsovetenskap",
  ],
  "Uppsala universitet": [
    "Ekonomie kandidatprogram",
    "Juristprogrammet",
    "Läkarprogrammet",
    "Civilingenjörsprogrammet i informationsteknologi",
    "Kandidatprogram i freds- och utvecklingsstudier",
  ],
  "Lunds universitet": [
    "Ekonomie kandidatprogram",
    "Juristprogrammet",
    "Läkarprogrammet",
    "Civilingenjörsutbildning i datateknik",
    "Kandidatprogram i strategisk kommunikation",
  ],
  "Karolinska Institutet": [
    "Läkarprogrammet",
    "Sjuksköterskeprogrammet",
    "Biomedicinska analytikerprogrammet",
    "Kandidatprogrammet i biomedicin",
    "Masterprogrammet i folkhälsovetenskap",
  ],
  "Kungliga Tekniska högskolan (KTH)": [
    "Civilingenjör Datateknik",
    "Civilingenjör Industriell ekonomi",
    "Civilingenjör Teknisk fysik",
    "Civilingenjör Samhällsbyggnad",
    "Masterprogram i maskininlärning",
  ],
};

export const COMMON_PROGRAM_SUGGESTIONS = [
  "Ekonomie kandidatprogram",
  "Juristprogrammet",
  "Läkarprogrammet",
  "Sjuksköterskeprogrammet",
  "Civilingenjör Datateknik",
  "Civilingenjör Industriell ekonomi",
  "Systemvetenskap",
  "Kandidatprogram i psykologi",
  "Socionomprogrammet",
  "Lärarprogrammet",
  "Masterprogram i hållbar utveckling",
] as const;

export const EMPTY_PROFILE: StudentProfile = {
  firstName: "",
  lastName: "",
  universitet: "",
  program: "",
  amnesomrade: "",
  termin: "",
  utbildningsniva: "",
  studieort: "",
  hemort: "",
  kon: "",
  ekonomi: "",
  omDig: "",
  engagemang: "",
  intressen: "",
  syfte: "",
  syfteAnnan: "",
};

export const PROFILE_REQUIRED_FIELDS: (keyof StudentProfile)[] = [
  "firstName", "lastName", "kon", "hemort",
  "universitet", "program", "amnesomrade", "utbildningsniva", "studieort",
  "syfte", "ekonomi",
];

export function profileCompleteness(p: StudentProfile | null): number {
  if (!p) return 0;
  const total = PROFILE_REQUIRED_FIELDS.length;
  const filled = PROFILE_REQUIRED_FIELDS.filter((k) => {
    const v = (p as any)[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  return Math.round((filled / total) * 100);
}

export function isProfileComplete(p: StudentProfile | null): boolean {
  return profileCompleteness(p) === 100;
}

export const KON_OPTIONS = ["Kvinna", "Man", "Annat", "Vill inte uppge"] as const;

export const UNIVERSITET_OPTIONS = [
  "Göteborgs universitet",
  "Chalmers tekniska högskola",
  "Stockholms universitet",
  "Kungliga Tekniska högskolan (KTH)",
  "Karolinska Institutet",
  "Handelshögskolan i Stockholm",
  "Uppsala universitet",
  "Sveriges lantbruksuniversitet",
  "Lunds universitet",
  "Umeå universitet",
  "Linköpings universitet",
  "Örebro universitet",
  "Karlstads universitet",
  "Linnéuniversitetet",
  "Mittuniversitetet",
  "Malmö universitet",
  "Södertörns högskola",
] as const;

export const STUDIEORT_OPTIONS = [
  "Göteborg", "Stockholm", "Lund", "Uppsala", "Umeå",
  "Linköping", "Örebro", "Växjö", "Karlstad",
] as const;

export const HEMORT_SUGGESTIONS = [
  "Stockholm", "Göteborg", "Malmö", "Uppsala", "Linköping", "Västerås", "Örebro",
  "Helsingborg", "Norrköping", "Jönköping", "Umeå", "Lund", "Borås", "Sundsvall",
  "Gävle", "Eskilstuna", "Halmstad", "Växjö", "Karlstad", "Kristianstad",
  "Södertälje", "Kalmar", "Östersund", "Trollhättan", "Luleå", "Skellefteå",
  "Falun", "Kiruna", "Visby", "Karlskrona", "Nyköping", "Varberg", "Motala",
] as const;

export const AMNESOMRADE_OPTIONS = [
  "Teknik / Ingenjörsvetenskap",
  "Datavetenskap / IT",
  "Medicin / Vård",
  "Naturvetenskap",
  "Ekonomi / Handel",
  "Juridik",
  "Samhällsvetenskap",
  "Humaniora / Språk",
  "Konst / Kultur / Design",
  "Pedagogik / Lärarutbildning",
  "Lantbruk / Miljö",
  "Annat",
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  "Grundnivå",
  "Avancerad nivå",
] as const;

export const ENGAGEMENT_OPTIONS = [
  "Ja, jag har föreningsengagemang eller ideellt arbete",
  "Nej / inte relevant",
] as const;

export const SYFTE_OPTIONS = [
  { value: "Extra ekonomiskt stöd under studierna", tags: ["ekonomiskt stöd", "levnadskostnader", "fritt"] },
  { value: "Utlandsstudier eller utbyte", tags: ["utbytesstudier", "utlandsstudier", "resor"] },
  { value: "Examensarbete", tags: ["examensarbete"] },
  { value: "Praktik", tags: ["praktik"] },
  { value: "Forskningsprojekt", tags: ["forskning", "projekt"] },
  { value: "Studieresa", tags: ["studieresa", "resor", "konferens"] },
  { value: "Kursavgift eller utbildningskostnader", tags: ["kursavgift", "kurslitteratur"] },
  { value: "Boende eller levnadsomkostnader", tags: ["levnadskostnader", "hyra"] },
  { value: "Annat", tags: ["fritt"] },
] as const;

export const EKONOMI_OPTIONS = [
  "Jag har inget särskilt ekonomiskt behov",
  "Jag har begränsad ekonomi under studierna",
  "Jag har svårt att täcka levnadsomkostnader",
  "Jag söker främst för att finansiera ett särskilt ändamål",
  "Vill inte uppge",
] as const;

export const SCHOLARSHIP_TYPES = [
  "Ekonomiskt stöd",
  "Utlandsstudier",
  "Examensarbete",
  "Praktik",
  "Forskning",
] as const;
export type ScholarshipType = typeof SCHOLARSHIP_TYPES[number];
