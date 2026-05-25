import { useLang } from "@/lib/i18n";

export function useTagTranslator() {
  const lang = useLang();

  return (tag: string) => {
    if (!tag) return tag;
    
    const enTranslations: Record<string, string> = {
      "studenter": "Students",
      "behövande": "Need-based",
      "datavetenskap/it": "Computer Science / IT",
      "teknik/ingenjörsvetenskap": "Engineering / Technology",
      "medicin/vård": "Medicine / Healthcare",
      "naturvetenskap": "Natural Sciences",
      "ekonomi/handel": "Business / Economics",
      "juridik": "Law",
      "samhällsvetenskap": "Social Sciences",
      "humaniora/språk": "Humanities / Languages",
      "konst/kultur/design": "Art / Culture / Design",
      "pedagogik/lärarutbildning": "Education / Teaching",
      "lantbruk/miljö": "Agriculture / Environment",
      "utlandsstudier": "Studies Abroad",
      "examensarbete": "Thesis / Degree Project",
      "praktik": "Internship",
      "utbildning": "Education",
      "ekonomiskt stöd": "Financial Support",
      "resor": "Travel"
    };
    const normalizedTag = tag
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*\/\s*/g, "/");
    if (lang === "en" && enTranslations[normalizedTag]) {
      return enTranslations[normalizedTag];
    }
    
    return tag.charAt(0).toUpperCase() + tag.slice(1); 
  };
}
