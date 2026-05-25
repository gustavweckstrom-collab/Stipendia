import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "public", "data", "scholarship-enrichment.json");
const SCHOLARSHIP_DIR = path.join(ROOT, "public", "data", "scholarships");
const SCHOLARSHIP_INDEX = path.join(SCHOLARSHIP_DIR, "index.json");
const SUPPLEMENTAL_PREFIX = "scholarships-enrichment-";
const SUPPLEMENTAL_PAGE_SIZE = 100;
const DEFAULT_NAME_PATTERN = /^stipendier_database_v5.*\.csv$/i;
const SKIP_DIRS = new Set([".git", "node_modules", "dist"]);

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " och ")
    .replace(/\baktiebolag\b|\bab\b/gi, "")
    .replace(/\b(stiftelsens|stiftelserna|stiftelsen|stiftelser|stiftelse|stipendiestiftelsen|stipendiestiftelse|stipendiefonden|stipendiefond|stipendierna|stipendier|stipendiet|stipendium|fonden|fond)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findCsvFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findCsvFiles(fullPath));
    else if (DEFAULT_NAME_PATTERN.test(entry.name)) found.push(fullPath);
  }
  return found;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsv(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function clean(value) {
  const text = String(value ?? "").replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim();
  return text || null;
}

function parseAmount(value) {
  const text = clean(value);
  if (!text) return { amount: null, amountText: null };
  const numbers = text.match(/\d[\d\s.,]*/g);
  if (!numbers || numbers.length !== 1) return { amount: null, amountText: text };
  const normalized = numbers[0].replace(/\s/g, "").replace(",", ".");
  const amount = Math.round(Number.parseFloat(normalized));
  if (!Number.isFinite(amount)) return { amount: null, amountText: text };
  const onlyNumber = text.replace(/\s/g, "").replace(",", ".") === normalized;
  return { amount, amountText: onlyNumber ? `${new Intl.NumberFormat("sv-SE").format(amount)} kr` : text };
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] ?? "";
  });
  return obj;
}

function convertCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text, detectDelimiter(text));
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => normalizeKey(header).replace(/\s+/g, ""));
  return rows.slice(1).map((row) => {
    const raw = rowToObject(headers, row);
    const { amount, amountText } = parseAmount(raw.amount);
    const name = clean(raw.name) ?? "";
    const foundation = clean(raw.foundation);
    return {
      name,
      foundation,
      amount,
      amountText,
      requirements: clean(raw.requirements),
      deadline: clean(raw.deadline),
      url: clean(raw.url),
      nameKey: normalizeKey(name),
      foundationKey: foundation ? normalizeKey(foundation) : null,
    };
  }).filter((item) => item.nameKey || item.foundationKey || item.url);
}

function safeSlug(value, fallback) {
  const slug = normalizeKey(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function scholarshipKeys(scholarship) {
  return [scholarship.name, scholarship.organization, scholarship.source?.name]
    .map(normalizeKey)
    .filter(Boolean);
}

function exactMatch(item, scholarships) {
  const itemKeys = [item.nameKey, item.foundationKey].filter(Boolean);
  return scholarships.some((scholarship) => {
    const keys = scholarshipKeys(scholarship);
    return itemKeys.some((key) => keys.includes(key));
  });
}

function detectField(item) {
  const text = normalizeKey(`${item.name} ${item.foundation ?? ""} ${item.requirements ?? ""}`);
  const rules = [
    ["Teknik / Ingenjörsvetenskap", ["ingenjor", "teknik", "civilingenjor", "vag", "vattenbyggnad", "maskin", "elektro"]],
    ["Ekonomi / Handel", ["ekonomi", "handel", "handels"]],
    ["Medicin / Vård", ["medicin", "vard", "sjukskoterska", "lakare"]],
    ["Juridik", ["juridik", "jurist"]],
    ["Naturvetenskap", ["naturvetenskap", "miljo", "biologi", "kemi", "fysik"]],
    ["Samhällsvetenskap", ["samhallsvetenskap", "socialt arbete"]],
    ["Humaniora / Språk", ["sprak", "humaniora", "teologi"]],
  ];
  return rules.filter(([, words]) => words.some((word) => text.includes(word))).map(([field]) => field);
}

function detectPurposes(item) {
  const text = normalizeKey(`${item.name} ${item.requirements ?? ""}`);
  const purposes = new Set(["ekonomiskt stöd"]);
  if (/(resa|resestipendium|utlands|utbyte|faltstudier|field studies)/.test(text)) purposes.add("resor");
  if (/(utlandsstudier|utbyte|utomlands|international|global)/.test(text)) purposes.add("utlandsstudier");
  if (/(examensarbete|uppsats|degree project)/.test(text)) purposes.add("examensarbete");
  if (/praktik/.test(text)) purposes.add("praktik");
  return Array.from(purposes);
}

function itemToScholarship(item, slugCounts) {
  const baseSlug = safeSlug(item.name, "stipendium").slice(0, 72);
  const count = (slugCounts.get(baseSlug) ?? 0) + 1;
  slugCounts.set(baseSlug, count);
  const id = `enrichment-${baseSlug}${count > 1 ? `-${count}` : ""}`;
  const fieldOfStudy = detectField(item);
  const purposes = detectPurposes(item);
  const tags = [
    "Studentrelevant",
    ...purposes,
    ...fieldOfStudy,
  ].filter(Boolean);

  return {
    id,
    name: item.name,
    organization: item.foundation ?? item.name,
    description: item.foundation
      ? `${item.name} administreras av ${item.foundation}. Kontrollera aktuell information via den externa länken.`
      : `${item.name}. Kontrollera aktuell information via den externa länken.`,
    descriptionEn: null,
    targetGroup: ["studenter"],
    requirements: item.requirements ? [item.requirements] : [],
    location: null,
    educationLevel: null,
    fieldOfStudy,
    amount: item.amount,
    amountText: item.amountText,
    deadline: item.deadline,
    applicationUrl: item.url,
    sourceUrl: item.url,
    officialWebsite: item.url,
    lastChecked: null,
    externalInfoStatus: item.url ? "direct" : "search-fallback",
    source: {
      name: "stipendier_database_v5 CSV",
      originalId: id,
      orgNumber: null,
      address: null,
      postalCode: null,
      city: null,
      phone: null,
      sourceUrl: item.url,
      officialWebsite: item.url,
    },
    tags,
    criteria: item.requirements ? [item.requirements] : [],
    requiredDocuments: [],
    eligibleUniversities: [],
    eligibleFields: fieldOfStudy,
    eligibleLocations: [],
    purposes,
    needBased: normalizeKey(item.requirements).includes("ekonom"),
    engagementRequired: false,
    enrichment: {
      source: "csv",
      matchedBy: "name",
      name: item.name,
      foundation: item.foundation,
      url: item.url,
    },
  };
}

function readBaseScholarshipIndex() {
  if (!fs.existsSync(SCHOLARSHIP_INDEX)) return null;
  const index = JSON.parse(fs.readFileSync(SCHOLARSHIP_INDEX, "utf8"));
  index.chunks = (index.chunks ?? []).filter((chunk) => !chunk.file.startsWith(SUPPLEMENTAL_PREFIX));
  if (index.idToChunk) {
    for (const id of Object.keys(index.idToChunk)) {
      if (String(index.idToChunk[id]).startsWith(SUPPLEMENTAL_PREFIX) || id.startsWith("enrichment-")) {
        delete index.idToChunk[id];
      }
    }
  }
  return index;
}

function readScholarshipsForIndex(index) {
  const scholarships = [];
  for (const chunk of index?.chunks ?? []) {
    const file = path.join(SCHOLARSHIP_DIR, chunk.file);
    if (fs.existsSync(file)) scholarships.push(...JSON.parse(fs.readFileSync(file, "utf8")));
  }
  return scholarships;
}

function removeOldSupplementalChunks() {
  if (!fs.existsSync(SCHOLARSHIP_DIR)) return;
  for (const entry of fs.readdirSync(SCHOLARSHIP_DIR)) {
    if (entry.startsWith(SUPPLEMENTAL_PREFIX) && entry.endsWith(".json")) {
      fs.unlinkSync(path.join(SCHOLARSHIP_DIR, entry));
    }
  }
}

function writeSupplementalChunks(items, baseIndex) {
  if (!baseIndex) return 0;
  removeOldSupplementalChunks();
  const scholarships = readScholarshipsForIndex(baseIndex);
  const slugCounts = new Map();
  const supplemental = items.map((item) => itemToScholarship(item, slugCounts));
  const supplementalChunks = [];

  for (let i = 0; i < supplemental.length; i += SUPPLEMENTAL_PAGE_SIZE) {
    const file = `${SUPPLEMENTAL_PREFIX}${String(supplementalChunks.length + 1).padStart(3, "0")}.json`;
    const chunkItems = supplemental.slice(i, i + SUPPLEMENTAL_PAGE_SIZE);
    fs.writeFileSync(path.join(SCHOLARSHIP_DIR, file), `${JSON.stringify(chunkItems)}\n`, "utf8");
    supplementalChunks.push({ file, start: 0, end: 0, count: chunkItems.length });
  }

  const chunks = [...supplementalChunks, ...baseIndex.chunks];
  let cursor = 1;
  for (const chunk of chunks) {
    chunk.start = cursor;
    chunk.end = cursor + chunk.count - 1;
    cursor += chunk.count;
  }

  baseIndex.chunks = chunks;
  baseIndex.total = chunks.reduce((sum, chunk) => sum + chunk.count, 0);
  baseIndex.pageSize = Math.max(baseIndex.pageSize ?? 0, SUPPLEMENTAL_PAGE_SIZE);
  baseIndex.generatedAt = new Date().toISOString();
  baseIndex.idToChunk = {};
  baseIndex.fieldChunks = {};
  const fields = new Set();
  const locations = new Set();

  for (const chunk of chunks) {
    const chunkItems = JSON.parse(fs.readFileSync(path.join(SCHOLARSHIP_DIR, chunk.file), "utf8"));
    for (const scholarship of chunkItems) {
      baseIndex.idToChunk[scholarship.id] = chunk.file;
      if (scholarship.location) locations.add(scholarship.location);
      for (const field of [...(scholarship.eligibleFields ?? []), ...(scholarship.fieldOfStudy ?? [])]) {
        fields.add(field);
        baseIndex.fieldChunks[field] = baseIndex.fieldChunks[field] ?? { count: 0, chunks: [] };
        baseIndex.fieldChunks[field].count += 1;
        if (!baseIndex.fieldChunks[field].chunks.includes(chunk.file)) baseIndex.fieldChunks[field].chunks.push(chunk.file);
      }
    }
  }
  baseIndex.fields = Array.from(fields).sort((a, b) => a.localeCompare(b, "sv"));
  baseIndex.locations = Array.from(new Set([...(baseIndex.locations ?? []), ...locations])).sort((a, b) => a.localeCompare(b, "sv"));

  fs.writeFileSync(SCHOLARSHIP_INDEX, `${JSON.stringify(baseIndex, null, 2)}\n`, "utf8");
  return supplemental.length;
}

const explicitCsv = process.argv[2] ? path.resolve(process.argv[2]) : null;
const csvFiles = explicitCsv ? [explicitCsv] : findCsvFiles(ROOT);
const csvPath = csvFiles.find((file) => fs.existsSync(file)) ?? null;
const items = csvPath ? convertCsv(csvPath) : [];
const supplementalCount = writeSupplementalChunks(items, readBaseScholarshipIndex());

const output = {
  generatedAt: new Date().toISOString(),
  sourceFile: csvPath ? path.relative(ROOT, csvPath) : null,
  count: items.length,
  description: "Extra CSV-information används endast när stipendiets namn eller stiftelse matchar konservativt. Huvuddatabasen är fortfarande de chunkade stipendiefilerna.",
  items,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");

if (!csvPath) {
  console.warn("No stipendier_database_v5 CSV file found. Wrote empty enrichment file.");
} else {
  console.log(`Wrote ${items.length} enrichment rows from ${path.relative(ROOT, csvPath)}.`);
  console.log(`Added ${supplementalCount} CSV-only scholarships as supplemental chunks.`);
}
