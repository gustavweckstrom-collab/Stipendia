import AppScreen from "@/components/layout/AppScreen";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useT, useLang } from "@/lib/i18n";

const FAQS_SV = [
  { q: "Vad är ett stipendium?", a: "Ett stipendium är en summa pengar som delas ut till studenter för att stödja deras studier, forskning, utlandsstudier eller projekt. Till skillnad från lån behöver stipendier inte betalas tillbaka." },
  { q: "Måste jag ha toppbetyg?", a: "Nej. En del stipendier baseras på studieresultat, men många väger även in engagemang, ekonomiskt behov, ämnesområde eller bakgrund." },
  { q: "Kan jag söka flera stipendier?", a: "Ja, du får söka så många stipendier du vill." },
  { q: "Är stipendier skattefria?", a: "Stipendier för studier är oftast skattefria i Sverige om de inte är ersättning för utfört arbete. Kontrollera alltid villkoren och Skatteverkets regler." },
  { q: "Hur skriver jag en bra ansökan?", a: "Var konkret om varför du söker, vad pengarna ska användas till och hur du uppfyller kriterierna. Kontrollera alltid aktuell information hos stiftelsen innan du skickar in." },
  { q: "Sparas mina uppgifter?", a: "All din profilinformation lagras endast lokalt i din webbläsare. Inget skickas till någon server." },
];

const FAQS_EN = [
  { q: "What is a scholarship?", a: "A scholarship is a sum of money awarded to students to support their studies, research, exchange or projects. Unlike loans, scholarships do not need to be repaid." },
  { q: "Do I need top grades?", a: "No. Some scholarships are based on grades, but many also weigh engagement, financial need, study field or background." },
  { q: "Can I apply for several scholarships?", a: "Yes — you may apply for as many as you like." },
  { q: "Are scholarships tax-free?", a: "Study scholarships are usually tax-free in Sweden if they aren't compensation for work. Always check the rules." },
  { q: "How do I write a good application?", a: "Be specific about why you're applying, what the funds will be used for, and how you meet the criteria. Always check current information with the foundation before submitting." },
  { q: "Is my data stored?", a: "All your profile data is stored locally in your browser. Nothing is sent to a server." },
];

export default function FAQ() {
  const t = useT();
  const lang = useLang();
  const FAQS = lang === "en" ? FAQS_EN : FAQS_SV;
  return (
    <AppScreen title={t("faq.title")} subtitle={t("faq.subtitle")} back>
      <div className="bg-card rounded-3xl border border-border/60 shadow-soft px-4">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className={i === FAQS.length - 1 ? "border-b-0" : ""}>
              <AccordionTrigger className="text-sm text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppScreen>
  );
}
