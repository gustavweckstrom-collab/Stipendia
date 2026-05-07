import { Link, useParams } from "react-router-dom";
import { Scholarship } from "@/data/scholarships";
import { loadScholarshipById } from "@/lib/scholarshipData";
import { loadDrafts, loadProfile, saveDraft } from "@/lib/storage";
import { checkEligibility } from "@/lib/eligibility";
import { generateDraft } from "@/lib/draft";
import { useState, useEffect } from "react";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RotateCw, Save, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

export default function DraftPage() {
  const t = useT();
  const { id } = useParams();
  const profile = loadProfile();
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let tt: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    if (!id) {
      setLoading(false);
      return;
    }
    loadScholarshipById(id).then((loaded) => {
      if (cancelled) return;
      setScholarship(loaded);
      if (!loaded) {
        setLoading(false);
        return;
      }
      const existing = loadDrafts().find((d) => d.scholarshipId === loaded.id);
      if (existing) {
        setText(existing.text);
        setLoading(false);
      } else if (profile) {
        tt = setTimeout(() => {
          const elig = checkEligibility(profile, loaded);
          const generated = generateDraft(profile, loaded, elig);
          setText(generated);
          saveDraft({
            scholarshipId: loaded.id,
            scholarshipName: loaded.name,
            text: generated,
            updatedAt: new Date().toISOString(),
          });
          setLoading(false);
        }, 400);
      } else {
        setLoading(false);
      }
    });
    return () => { cancelled = true; if (tt) clearTimeout(tt); };
  }, [id]);

  if (loading && !scholarship) {
    return <AppScreen title={t("draft.title")} back><p className="text-sm text-muted-foreground text-center py-10">{t("sch.loading")}</p></AppScreen>;
  }

  if (!scholarship) {
    return <AppScreen title={t("draft.title")} back><p className="text-sm text-muted-foreground text-center py-10">—</p></AppScreen>;
  }

  if (!profile) {
    return (
      <AppScreen title={t("draft.title")} back>
        <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
          <StipendiaIllustration variant="profile" className="mb-4" />
          <FileText className="h-10 w-10 text-primary mx-auto" />
          <h2 className="mt-3 text-base font-semibold">{t("draft.profileFirst")}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("draft.profileFirstDesc")}</p>
          <Button asChild className="mt-4 rounded-xl"><Link to="/profil">{t("home.startProfile")}</Link></Button>
        </div>
      </AppScreen>
    );
  }

  const regenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const elig = checkEligibility(profile, scholarship);
      const generated = generateDraft(profile, scholarship, elig);
      setText(generated);
      saveDraft({ scholarshipId: scholarship.id, scholarshipName: scholarship.name, text: generated, updatedAt: new Date().toISOString() });
      setLoading(false);
      toast.success(t("draft.regenerated"));
    }, 300);
  };

  const copy = async () => { await navigator.clipboard.writeText(text); toast.success(t("draft.copied")); };

  const save = () => {
    saveDraft({ scholarshipId: scholarship.id, scholarshipName: scholarship.name, text, updatedAt: new Date().toISOString() });
    toast.success(t("draft.saved"));
  };

  return (
    <AppScreen title={t("draft.title")} subtitle={scholarship.name} back>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-2xl bg-warning/10 border border-warning/30 p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/85 leading-relaxed">
            <span className="font-semibold">{t("draft.warning")}</span> {t("draft.warningDesc")}
          </p>
        </div>

        <div className="rounded-3xl bg-card border border-border/60 p-3 shadow-soft">
          {loading ? (
            <div className="space-y-2 animate-pulse py-2">
              {[92, 76, 84, 68, 95, 72, 88, 64].map((width, i) => (
                <div key={i} className="h-2.5 bg-secondary rounded" style={{ width: `${width}%` }} />
              ))}
            </div>
          ) : (
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} className="font-mono text-[12px] leading-relaxed border-0 focus-visible:ring-0 resize-none p-1 bg-transparent" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={save} className="rounded-xl h-11 text-xs"><Save className="h-3.5 w-3.5 mr-1" /> {t("draft.save")}</Button>
          <Button variant="outline" onClick={copy} className="rounded-xl h-11 text-xs"><Copy className="h-3.5 w-3.5 mr-1" /> {t("draft.copy")}</Button>
          <Button variant="outline" onClick={regenerate} className="rounded-xl h-11 text-xs"><RotateCw className="h-3.5 w-3.5 mr-1" /> {t("draft.regenerate")}</Button>
        </div>
      </div>
    </AppScreen>
  );
}
