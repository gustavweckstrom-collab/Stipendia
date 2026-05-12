import { useLang } from "@/lib/i18n";

export function useTagTranslator() {
  const lang = useLang();

  return (tag: string) => {
    const enTranslations: Record<string, string> = {
      "studenter": "Students",
      "behövande": "Need-based",
      "Datavetenskap / IT": "Computer Science / IT",
      "Teknik / Ingenjörsvetenskap": "Engineering / Technology",
      "Medicin / Vård": "Medicine / Healthcare",
      "Naturvetenskap": "Natural Sciences",
      "Ekonomi / Handel": "Business / Economics",
      "Juridik": "Law",
      "Samhällsvetenskap": "Social Sciences",
      "Humaniora / Språk": "Humanities / Languages",
      "Konst / Kultur / Design": "Art / Culture / Design",
      "Pedagogik / Lärarutbildning": "Education / Teaching",
      "Lantbruk / Miljö": "Agriculture / Environment",
      "utlandsstudier": "Studies Abroad",
      "examensarbete": "Thesis / Degree Project",
      "praktik": "Internship",
      "utbildning": "Education",
      "ekonomiskt stöd": "Financial Support",
      "resor": "Travel"
    };

    if (lang === "en" && enTranslations[tag]) {
      return enTranslations[tag];
    }
    
    return tag; 
  };
}
