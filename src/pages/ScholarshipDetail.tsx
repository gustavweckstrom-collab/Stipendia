import { Link, useParams } from "react-router-dom";
import { Scholarship } from "@/data/scholarships";
import {
  distinctEligibilityRequirements,
  eligibilityHighlights,
  externalApplicationUrl,
  hasDirectApplicationTarget,
  loadScholarshipById,
  primaryScholarshipCategory,
  scholarshipLocationLabel,
} from "@/lib/scholarshipData";
import { loadProfile, loadSavedIds, toggleSaved, isApplied, toggleApplied } from "@/lib/storage";
import { checkEligibility } from "@/lib/eligibility";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, FileText, CheckCircle2, AlertCircle, Bookmark, BookmarkCheck, Check, Info, Tag, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useT, useLang } from "@/lib/i18n";
import { ApplicationStateBadge, EligibilityBadge } from "@/components/StatusBadge";
import { DOC_TYPES } from "@/types/profile";
import { toast } from "sonner";

const documentLabelToType = new Map(DOC_TYPES.map(({ k, label }) => [label, k]));

export default function ScholarshipDetail() {
  const t = useT();
  const lang = useLand();
  const { id } = useParams();
  const profile = loadProfile();
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setAppliedState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (id) {
      setSaved(loadSavedIds().includes(id));
      setAppliedState(isApplied(id));
      loadScholarshipById(id).then((item) => {
        if (!cancelled) setScholarship(item);
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <AppScreen title={t("sch.title")} back><p className="text-sm text-muted-foreground text-center py-10">{t("sch.loading")}</p></AppScreen>;
  }

  if (!scholarship) {
    return <AppScreen title={t("sch.title")} back><p className="text-sm text-muted-foreground text-center py-10">—</p></AppScreen>;
  }

  const s = scholarship;
  const elig = profile ? checkEligibility(profile, s) : null;
  const uploadedDocTypes = new Set((profile?.uploads ?? []).map((u) => u.documentType));
  const legacyDocs = profile?.dokument;
  const category = primaryScholarshipCategory(s) ?? t("sch.studentRelevant");
  const place = scholarshipLocationLabel(s) || s.organization || t("common.missing");
  const requirementTexts = distinctEligibilityRequirements(s);
  const eligibilityPoints = eligibilityHighlights(s);
  const directApplication = hasDirectApplicationTarget(s);
  const visibleRequiredDocuments = (s.requiredDocuments ?? []).filter((d) => documentLabelToType.has(d));

  return (
    <AppScreen
      title={s.name}
      back
      right={
        <button
          onClick={() => {
            const next = toggleSaved(s.id);
            const isSavedNow = next.includes(s.id);
            setSaved(isSavedNow);
            toast.success(isSavedNow ? t("saved.savedToast") : t("saved.removedToast"));
          }}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary text-foreground"
          aria-label={t("nav.saved")}
        >
          {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-primary/15 bg-primary-soft/55 p-4 shadow-soft">
          <p className="text-[11px] text-primary flex items-center gap-1 font-semibold"><Building2 className="h-3 w-3" /> {place}</p>
          <h2 className="font-bold text-lg mt-0.5 leading-tight">{s.name}</h2>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="inline-flex rounded-full border border-primary/15 bg-white px-2.5 py-1 text-xs font-semibold text-primary">{category}</p>
            {elig && <EligibilityBadge eligible={elig.eligible} className="text-xs" />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              <GraduationCap className="h-3.5 w-3.5" /> {t("sch.studentRelevantShort")}
            </span>
            {!directApplication && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <ExternalLink className="h-3.5 w-3.5" /> {t("sch.externalSourceShort")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ApplicationStateBadge applied={applied} />
          <button
            onClick={() => { const next = toggleApplied(s.id); setAppliedState(next.includes(s.id)); }}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-card"
          >
            <Check className="h-3 w-3" /> {applied ? t("match.statusApplied") : t("sch.markApplied")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoTile icon={Building2} label={t("sch.location")} value={place} />
          <InfoTile icon={Tag} label={t("sch.category")} value={category} />
        </div>

        {(s.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.tags.map((tg) => <span key={tg} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{tg}</span>)}
          </div>
        )}

        <Section title={t("sch.description")}>
          <p className="text-sm text-foreground/85 leading-relaxed">{lang == "en" && s.descriptionEn ? s.descriptionEn : (s.description || t("common.missing"))}</p>
        </Section>

        <Section title={t("sch.whoCanApply")}>
          <ul className="space-y-1.5">
            {eligibilityPoints.map((point) => (
              <li key={point} className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/85">{point}</span>
              </li>
            ))}
          </ul>
          {(s.targetGroup ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.targetGroup.map((group) => (
                <span key={group} className="rounded-full border border-border/60 bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {group}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("sch.requirementsToCheck")}>
          {requirementTexts.length > 0 ? (
            <ul className="space-y-1.5">
              {requirementTexts.map((c) => (
                <li key={c} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/75 leading-relaxed">{t("sch.requirementsNeedReview")}</p>
          )}
        </Section>

        {elig && (elig.reasons.length > 0 || elig.blockers.length > 0) && (
          <div className="rounded-3xl border border-border/60 bg-card p-4">
            {elig.reasons.length > 0 && (
              <>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-success"><CheckCircle2 className="h-4 w-4" /> {t("sch.whyEligible")}</h3>
                <ul className="list-disc space-y-1 mb-3 pl-4">
                  {elig.reasons.map((r, i) => <li key={i} className="text-[12px] text-foreground/80">{r}</li>)}
                </ul>
              </>
            )}
            {elig.blockers.length > 0 && (
              <>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-muted-foreground"><AlertCircle className="h-4 w-4" /> {t("sch.whyNot")}</h3>
                <ul className="list-disc space-y-1 pl-4">
                  {elig.blockers.map((r, i) => <li key={i} className="text-[12px] text-foreground/70">{r}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        {visibleRequiredDocuments.length > 0 && (
          <Section title={t("sch.checklist")}>
            <div className="space-y-1.5">
              {visibleRequiredDocuments.map((d) => {
                const key = documentLabelToType.get(d);
                const owned = Boolean(key && (uploadedDocTypes.has(key) || legacyDocs?.[key]));
                return (
                  <div key={d} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                    <span className="text-sm font-medium">{d}</span>
                    {owned ? (
                      <span className="text-[11px] font-semibold text-success flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {t("sch.docHave")}</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-muted-foreground">{t("sch.docMissing")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <Section title={t("sch.application")}>
          <div className="rounded-2xl border border-border/60 bg-secondary/50 p-3 flex gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">{t("sch.applicationInfoNote")}</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{t("sch.applyHelper")}</p>
          <div className="mt-3 space-y-2">
            <Button asChild className="w-full rounded-xl shadow-glow h-12">
              <a href={externalApplicationUrl(s)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> {t("sch.applyExternal")}</a>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl h-11">
              <Link to={`/utkast/${s.id}`}><FileText className="h-4 w-4 mr-1.5" /> {t("sch.createDraft")}</Link>
            </Button>
          </div>
        </Section>
      </div>
    </AppScreen>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 font-semibold text-sm leading-tight">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4">
      <h3 className="font-semibold text-sm mb-2 text-foreground">{title}</h3>
      {children}
    </section>
  );
}
