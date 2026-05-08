import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "Alla sveriges stiftelser för studenter.xlsx");
const OUT_DIR = path.join(ROOT, "public", "data", "scholarships");
const PAGE_SIZE = 100;
const FILTER_DESCRIPTION = "Endast stipendier relevanta för universitets- och högskolestudenter";

const FIELD_RULES = [
  ["Datavetenskap / IT", ["datavetenskap", "informatik", "programmering", "dataingenjor", "it-studier", "it utbildning"]],
  ["Teknik / Ingenjörsvetenskap", ["teknik", "teknisk", "ingenjor", "civilingenjor", "arkitektutbildning"]],
  ["Medicin / Vård", ["medicin", "lakare", "lakarutbildning", "sjukskoterska", "sjukskoterskeutbildning", "vardutbildning", "farmaci", "odontologi"]],
  ["Naturvetenskap", ["naturvetenskap", "biologi", "kemi", "fysik", "matematik", "geologi"]],
  ["Ekonomi / Handel", ["ekonomi", "handelshogskola", "foretagsekonomi", "handelsstudier"]],
  ["Juridik", ["juridik", "jurist", "juristutbildning", "rattsvetenskap"]],
  ["Samhällsvetenskap", ["samhallsvetenskap", "statsvetenskap", "socionom", "socialt arbete"]],
  ["Humaniora / Språk", ["humaniora", "sprak", "teologi", "filosofi", "historia"]],
  ["Konst / Kultur / Design", ["konst", "kultur", "design", "konsthantverk", "musik", "arkitektur"]],
  ["Pedagogik / Lärarutbildning", ["pedagogik", "lararutbildning", "lararhogskola"]],
  ["Lantbruk / Miljö", ["lantbruk", "jordbruk", "skog", "miljo", "hallbarhet"]],
];

const PURPOSE_RULES = [
  ["utlandsstudier", ["utlandsstudier", "utbyte", "utbytesstudier"]],
  ["examensarbete", ["examensarbete", "uppsatsarbete", "kandidatuppsats", "masteruppsats"]],
  ["praktik", ["praktik"]],
  ["utbildning", ["studier", "utbildning", "hogre utbildning", "eftergymnasial"]],
  ["ekonomiskt stöd", ["stipendium", "stipendier", "bidrag", "understod", "understöd", "ekonomiskt stod", "ekonomiskt stöd"]],
  ["resor", ["studieresa", "studieresor"]],
];

const DIRECT_STUDENT_PATTERNS = [
  "student",
  "studenter",
  "studerande",
  "universitetsstudent",
  "hogskolestudent",
  "högskolestudent",
  "vid universitet",
  "vid hogskola",
  "vid högskola",
  "universitet och hogskola",
  "universitet och högskola",
  "universitets- och hogskolestudier",
  "universitets- och högskolestudier",
  "hogskolestudier",
  "högskolestudier",
  "universitetsstudier",
  "eftergymnasial",
  "akademiska studier",
  "hogre studier",
  "högre studier",
  "hogre utbildning",
  "högre utbildning",
  "examensarbete",
  "kandidatprogram",
  "kandidatexamen",
  "kandidatniva",
  "kandidatnivå",
  "kandidatuppsats",
  "master",
  "magister",
  "civilingenjor",
  "civilingenjör",
  "ingenjorsutbildning",
  "ingenjörsutbildning",
  "lakarutbildning",
  "läkarutbildning",
  "sjukskoterskeutbildning",
  "sjuksköterskeutbildning",
  "juristutbildning",
  "lararutbildning",
  "lärarutbildning",
  "handelshogskola",
  "handelshögskola",
  "tekniska hogskola",
  "tekniska högskola",
];

const STUDY_WORDS = [
  "studier",
  "studiebegavning",
  "studiebegåvning",
  "studielamplighet",
  "studielämplighet",
  "studiehjälp",
  "studiehjalp",
];

const SUPPORT_WORDS = [
  "stipendium",
  "stipendier",
  "stipendiefond",
  "utbildningsstipendium",
  "utbildningsstipendier",
  "bidrag",
  "understod",
  "understöd",
  "utdelas",
  "utdela",
  "anslag",
  "studiehjälp",
  "studiehjalp",
  "bekosta",
];

const DOCTORAL_OR_ACADEMIC_PATTERNS = [
  "doktorand",
  "doktorander",
  "forskarutbildning",
  "postdok",
  "postdoc",
  "professor",
  "docent",
];

const RESEARCH_PATTERNS = [
  "forskning",
  "forskare",
  "forskningsprojekt",
  "forskningsverksamhet",
  "vetenskaplig forskning",
  "vetenskaplig verksamhet",
];

const SCHOOL_YOUTH_PATTERNS = [
  "gymnasium",
  "gymnasie",
  "gymnasier",
  "gymnasieskola",
  "gymnasieskol",
  "gymnasieelev",
  "gymnasieelever",
  "tekniska gymnasier",
  "grundskola",
  "grundskolans",
  "skolelev",
  "skolelever",
  "barn",
  "barns vard",
  "barns vård",
  "ungdoms vard",
  "ungdoms vård",
  "vard och fostran",
  "vård och fostran",
  "fostran av barn",
  "under hogskolestadiet",
  "under högskolestadiet",
  "folkskola",
  "smaskola",
  "småskola",
  "folkhogskola",
  "folkhögskola",
  "laroverk",
  "läroverk",
  "hogskoleforberedande",
  "högskoleförberedande",
];

const NON_STUDENT_GROUP_PATTERNS = [
  "idrott",
  "idrottsforening",
  "idrottsförening",
  "idrottare",
  "elitidrott",
  "idrottsutovare",
  "idrottsutövare",
  "tennis",
  "tennisspelare",
  "fotboll",
  "hockey",
  "golf",
  "foreningar",
  "föreningar",
  "organisationer",
  "foretag",
  "företag",
  "näringsidkare",
  "yrkesverksamma",
  "yrkesverksam",
  "yrkesutbildning",
  "yrkesskola",
  "yrkesskolor",
  "anstallda",
  "anställda",
  "anstalldas",
  "anställdas",
  "larare vid",
  "lärare vid",
  "larare",
  "lärare",
  "lararinnor",
  "lärarinnor",
  "yrkeslarare",
  "yrkeslärare",
  "rektorer",
  "konstnar",
  "konstnär",
  "musiker",
  "kulturutovare",
  "kulturutövare",
];

const SOCIAL_HELP_PATTERNS = [
  "aldre",
  "äldre",
  "alderstigna",
  "ålderstigna",
  "sjuka",
  "lytta",
  "vardbehovande",
  "vårdbehövande",
  "social hjalp",
  "social hjälp",
  "handikappade",
  "funktionshindrade",
  "behovande",
  "behövande",
  "medellosa",
  "medellösa",
];

const FAMILY_PATTERNS = [
  "medlemmar i familjen",
  "slakten",
  "släkten",
  "efterkommande",
  "ättlingar",
  "attlingar",
];

const HIGHER_EDUCATION_CONTEXT_PATTERNS = [
  "universitet",
  "hogskola",
  "högskola",
  "akademiska studier",
  "hogre studier",
  "högre studier",
  "hogre utbildning",
  "högre utbildning",
  "eftergymnasial",
];

const UNDERGRADUATE_OR_PROGRAM_PATTERNS = [
  "grundutbildning",
  "grundniva",
  "grundnivå",
  "avancerad niva",
  "avancerad nivå",
  "examensarbete",
  "uppsatsarbete",
  "kandidatuppsats",
  "kandidatprogram",
  "kandidatexamen",
  "kandidatniva",
  "kandidatnivå",
  "masterprogram",
  "masterstudent",
  "masteruppsats",
  "magister",
  "civilingenjor",
  "civilingenjör",
  "ingenjorsutbildning",
  "ingenjörsutbildning",
  "lakarutbildning",
  "läkarutbildning",
  "sjukskoterskeutbildning",
  "sjuksköterskeutbildning",
  "juristutbildning",
  "lararutbildning",
  "lärarutbildning",
];

const STUDENT_PROJECT_PATTERNS = [
  "examensarbete",
  "uppsatsarbete",
  "kandidatuppsats",
  "masteruppsats",
];

const CURRENT_UNIVERSITY_STUDENT_PATTERNS = [
  "studenter vid universitet",
  "studenter vid hogskola",
  "studenter vid högskola",
  "studerar vid universitet",
  "studerar vid hogskola",
  "studerar vid högskola",
  "studerande vid universitet",
  "studerande vid hogskola",
  "studerande vid högskola",
  "studerande vid goteborgs universitet",
  "studerande vid göteborgs universitet",
  "studerande vid uppsala universitet",
  "studerande vid lunds universitet",
  "studerande vid stockholms universitet",
];

const PRE_UNIVERSITY_TRANSITION_PATTERNS = [
  "amnar fortsatta sina studier",
  "ämnar fortsätta sina studier",
  "amna fortsatta sina studier",
  "ämna fortsätta sina studier",
  "efter avlagd examen vid laroverket",
  "efter avlagd examen vid läroverket",
  "efter avlagd examen vid gymnasiet",
  "avlagd studentexamen",
  "gar sista aret i gymnasiet",
  "går sista året i gymnasiet",
  "paborja studier",
  "påbörja studier",
  "hogskoleforberedande program",
  "högskoleförberedande program",
];

const PROFESSIONAL_OR_PRIVATE_GROUP_PATTERNS = [
  "medlemmar i",
  "medlem av",
  "medlemmar av",
  "forbund",
  "förbund",
  "forening",
  "förening",
  "bransch",
  "anstallda",
  "anställda",
  "anstalldas",
  "anställdas",
  "yrkesverksam",
  "yrkesverksamma",
  "legitimerade",
  "lakare",
  "läkare",
  "journalister",
  "handelsagenter",
  "forsamlingsmedlemmar",
  "församlingsmedlemmar",
  "forsamlingens",
  "församlingens",
  "naringsidkare",
  "näringsidkare",
  "egna foretagare",
  "egna företagare",
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_x000D_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/_x000D_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(normalizeText(pattern)));
}

function extractMatches(text, rules) {
  return rules
    .filter(([, terms]) => terms.some((term) => text.includes(normalizeText(term))))
    .map(([label]) => label);
}

function xmlDecode(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Kunde inte läsa xlsx-arkivet.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Ogiltig zip central directory.");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : zlib.inflateRawSync(compressed);
    entries.set(name, data.toString("utf8"));

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlDecode(m[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

function columnIndex(ref) {
  const letters = ref.replace(/\d+/g, "");
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

function attr(attrs, name) {
  return attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
}

function parseSheet(xml, sharedStrings) {
  const rows = [];
  const rowMatches = xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const cells = [];
    for (const cell of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1];
      const body = cell[2];
      const ref = attr(attrs, "r");
      const type = attr(attrs, "t");
      const valueRaw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      let value = "";
      if (type === "s") value = sharedStrings[Number(valueRaw)] ?? "";
      else if (type === "inlineStr") value = xmlDecode(body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "");
      else value = xmlDecode(valueRaw);
      cells[columnIndex(ref)] = value;
    }
    rows.push(cells);
  }
  const headers = rows.shift()?.map((header) => cleanText(header)) ?? [];
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, cleanText(row[index] ?? "")])));
}

function shouldExcludeScholarship(row) {
  const text = normalizeText([
    row.NAMN,
    row.Name,
    row.ORT,
    row.ANDAMAL,
    row.FIRMATECKNING,
  ].join(" "));
  const hasExplicitStudent = hasAny(text, ["student", "studenter", "studerande", "universitetsstudent", "hogskolestudent", "högskolestudent"]);
  const hasHigherEducation = hasAny(text, HIGHER_EDUCATION_CONTEXT_PATTERNS);
  const hasUndergraduateOrProgram = hasAny(text, UNDERGRADUATE_OR_PROGRAM_PATTERNS);
  const hasStudentProject = hasAny(text, STUDENT_PROJECT_PATTERNS);
  const hasStudy = hasAny(text, STUDY_WORDS);
  const hasSupport = hasAny(text, SUPPORT_WORDS);
  const hasCurrentUniversityStudentPhrase = hasAny(text, CURRENT_UNIVERSITY_STUDENT_PATTERNS);
  const hasPreUniversityTransition = hasAny(text, PRE_UNIVERSITY_TRANSITION_PATTERNS);
  const hasClearUniversityStudentSignal = hasStudentProject || hasCurrentUniversityStudentPhrase || (hasExplicitStudent && (hasHigherEducation || hasUndergraduateOrProgram));
  const hasStudentAndSupport = (hasExplicitStudent || hasHigherEducation || hasUndergraduateOrProgram || hasStudy) && hasSupport;
  const hasResearch = hasAny(text, RESEARCH_PATTERNS);
  const hasSchoolYouth = hasAny(text, SCHOOL_YOUTH_PATTERNS);
  const hasNonStudentGroup = hasAny(text, NON_STUDENT_GROUP_PATTERNS);
  const hasProfessionalOrPrivateGroup = hasAny(text, PROFESSIONAL_OR_PRIVATE_GROUP_PATTERNS);

  if (hasAny(text, DOCTORAL_OR_ACADEMIC_PATTERNS) && !hasStudentProject) return true;
  if (hasResearch && !hasStudentProject) return true;
  if (hasSchoolYouth && !hasStudentProject && !hasCurrentUniversityStudentPhrase) return true;
  if (hasPreUniversityTransition && !hasCurrentUniversityStudentPhrase) return true;
  if (hasNonStudentGroup && !hasClearUniversityStudentSignal) return true;
  if (hasProfessionalOrPrivateGroup && !hasClearUniversityStudentSignal) return true;
  if (hasAny(text, SOCIAL_HELP_PATTERNS) && !hasClearUniversityStudentSignal) return true;
  if (hasAny(text, FAMILY_PATTERNS) && !hasClearUniversityStudentSignal) return true;

  const educationOnly = text.includes("utbildning") && !hasHigherEducation && !hasExplicitStudent && !hasUndergraduateOrProgram && !hasStudy;
  if (educationOnly && (hasResearch || hasNonStudentGroup || hasProfessionalOrPrivateGroup)) return true;

  return !(hasStudentAndSupport && !educationOnly);
}

function isRelevantForUniversityStudent(row) {
  return !shouldExcludeScholarship(row);
}

function deriveTargetGroup(text) {
  const target = [];
  if (hasAny(text, ["student", "studenter", "studerande", "universitet", "hogskola", "högskola", "eftergymnasial"])) target.push("studenter");
  if (hasAny(text, ["ekonomiskt behov", "medellos", "medellös", "behovande", "behövande"])) target.push("behövande");
  return target;
}

function deriveScholarship(row, index) {
  const name = cleanText(row.NAMN || row.Name || `Stiftelse ${index + 1}`);
  const description = cleanText(row.ANDAMAL);
  const text = normalizeText([name, description, row.ORT].join(" "));
  const fieldOfStudy = extractMatches(text, FIELD_RULES);
  const targetGroup = deriveTargetGroup(text);
  if (targetGroup.length === 0) targetGroup.push("studenter");
  const purposes = extractMatches(text, PURPOSE_RULES).filter((purpose) => purpose !== "forskning");
  const location = cleanText(row.ORT) || null;
  const tags = Array.from(new Set([
    location,
    ...targetGroup,
    ...fieldOfStudy,
    ...purposes,
  ].filter(Boolean)));
  const originalId = cleanText(row.ID) || String(index + 1);

  return {
    id: `foundation-${originalId}`,
    name,
    organization: name,
    description,
    targetGroup,
    requirements: [],
    location,
    educationLevel: null,
    fieldOfStudy,
    amount: null,
    deadline: null,
    applicationUrl: null,
    sourceUrl: null,
    officialWebsite: null,
    lastChecked: null,
    externalInfoStatus: "search-fallback",
    source: {
      name: path.basename(SOURCE_FILE),
      originalId,
      orgNumber: cleanText(row.ORGNR) || null,
      address: [row.COADRESS, row.ADRESS].map(cleanText).filter(Boolean).join(" ") || null,
      postalCode: cleanText(row.POSTNR) || null,
      city: location,
      phone: cleanText(row.TELEFON) || null,
      sourceUrl: null,
      officialWebsite: null,
    },
    tags,
    criteria: description ? [description] : [],
    requiredDocuments: [],
    eligibleUniversities: [],
    eligibleFields: fieldOfStudy,
    eligibleLocations: [],
    purposes,
    needBased: hasAny(text, ["ekonomiskt behov", "medellos", "medellös", "behovande", "behövande"]),
    engagementRequired: hasAny(text, ["foreningsengagemang", "föreningsengagemang", "ideellt arbete"]),
  };
}

function buildFieldChunks(chunks) {
  const fieldChunks = {};
  for (const chunk of chunks) {
    const counts = new Map();
    for (const item of chunk.items) {
      const fields = new Set([...(item.fieldOfStudy ?? []), ...(item.eligibleFields ?? [])].filter(Boolean));
      for (const field of fields) counts.set(field, (counts.get(field) ?? 0) + 1);
    }
    for (const [field, count] of counts) {
      fieldChunks[field] ??= { count: 0, chunks: [] };
      fieldChunks[field].count += count;
      fieldChunks[field].chunks.push(chunk.file);
    }
  }
  return Object.fromEntries(Object.entries(fieldChunks).sort(([a], [b]) => a.localeCompare(b, "sv")));
}

function writeData(items, totalOriginalCount) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (/^scholarships-\d+\.json$/.test(file)) fs.unlinkSync(path.join(OUT_DIR, file));
  }

  const chunks = [];
  const idToChunk = {};
  for (let start = 0; start < items.length; start += PAGE_SIZE) {
    const chunkItems = items.slice(start, start + PAGE_SIZE);
    const number = String(chunks.length + 1).padStart(3, "0");
    const file = `scholarships-${number}.json`;
    for (const item of chunkItems) idToChunk[item.id] = file;
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(chunkItems), "utf8");
    chunks.push({
      file,
      start: start + 1,
      end: start + chunkItems.length,
      count: chunkItems.length,
      items: chunkItems,
    });
  }

  const fields = Array.from(new Set(items.flatMap((item) => item.fieldOfStudy ?? []))).sort((a, b) => a.localeCompare(b, "sv"));
  const locations = Array.from(new Set(items.map((item) => item.location).filter(Boolean))).sort((a, b) => a.localeCompare(b, "sv"));
  const index = {
    total: items.length,
    pageSize: PAGE_SIZE,
    totalOriginalCount,
    totalFilteredCount: items.length,
    filterDescription: FILTER_DESCRIPTION,
    generatedAt: new Date().toISOString(),
    generatedFrom: path.basename(SOURCE_FILE),
    chunks: chunks.map(({ items: _items, ...chunk }) => chunk),
    fields,
    fieldChunks: buildFieldChunks(chunks),
    locations,
    idToChunk,
  };
  fs.writeFileSync(path.join(OUT_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function main() {
  const entries = readZipEntries(SOURCE_FILE);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml"));
  const rows = parseSheet(entries.get("xl/worksheets/sheet1.xml"), sharedStrings);
  const filteredRows = rows.filter(isRelevantForUniversityStudent);
  const scholarships = filteredRows.map(deriveScholarship);
  writeData(scholarships, rows.length);

  console.log(`Kolumner: ${Object.keys(rows[0] ?? {}).join(", ")}`);
  console.log(`Originalposter: ${rows.length}`);
  console.log(`Filtrerade poster: ${scholarships.length}`);
  console.log(`Chunks: ${Math.ceil(scholarships.length / PAGE_SIZE)}`);
}

main();
