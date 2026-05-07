import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import { externalApplicationUrl, loadFirstScholarshipChunk, loadScholarshipChunk } from "@/lib/scholarshipData";
import { checkEligibility } from "@/lib/eligibility";
import { isApplied, loadProfile, toggleApplied } from "@/lib/storage";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { AlertCircle, Building2, Check, CheckCircle2, CircleHelp, ExternalLink, FileEdit, ShieldCheck, Sparkles, Tag, UserPlus } from "lucide-react";
import { StudentProfile } from "@/types/profile";
import { useT } from "@/lib/i18n";
import { ApplicationStateBadge, EligibilityStateBadge } from "@/components/StatusBadge";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

type EligibilityState = "eligible" | "review" | "not-eligible";
type EligibilityItem = {
  s: Scholarship;
  state: EligibilityState;
  reasons: string[];
  blockers: string[];
};

const classify = (reasons: string[], blockers: string[]): EligibilityState => {
  if (blockers.length === 0) return "eligible";
  if (reasons.length > 0) return "review";
  return "not-eligible";
};

export default function Matches() {
  const t = useT();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [index, setIndex] = useState<ScholarshipIndex | null>(null);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [nextChunk, setNextChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => { setProfile(loadProfile()); setTick((x) => x + 1); };
    refresh();
    window.addEventListener("stipendia:update", refresh);
    return () => window.removeEventListener("stipendia:update", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFirstScholarshipChunk()
      .then(({ index, items, nextChunk }) => {
        if (cancelled) return;
        setIndex(index);
        setItems(items);
        setNextChunk(nextChunk);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const loadMore = useCallback(async () => {
    if (!index || loadingMore || nextChunk >= index.chunks.length) return;
    setLoadingMore(true);
    try {
      const chunk = await loadScholarshipChunk(index.chunks[nextChunk].file);
      setItems((current) => [...current, ...chunk]);
      setNextChunk((current) => current + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [index, loadingMore, nextChunk]);

  const eligibilityItems = useMemo(() => {
    if (!profile) return [] as EligibilityItem[];
    return items.map((s) => {
      const result = checkEligibility(profile, s);
      return { s, state: classify(result.reasons, result.blockers), reasons: result.reasons, blockers: result.blockers };
    }).sort((a, b) => {
      const order: Record<EligibilityState, number> = { eligible: 0, review: 1, "not-eligible": 2 };
      return order[a.state] - order[b.state];
    });
  }, [profile, items]);

  const eligible = eligibilityItems.filter((i) => i.state === "eligible");
  const review = eligibilityItems.filter((i) => i.state === "review");
  const notEligible = eligibilityItems.filter((i) => i.state === "not-eligible");
  const hasMoreChunks = Boolean(index && nextChunk < index.chunks.length);

  if (!profile) {
    return (
      <AppScreen title={t("match.title")} subtitle={t("match.profileNeeded")}>
        <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
          <StipendiaIllustration variant="profile" className="mb-4" />
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="font-semibold text-base">{t("match.profileNeeded")}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t("match.profileNeededDesc")}</p>
          <Button onClick={() => navigate("/profil?edit=1")} className="mt-4 rounded-xl gap-2">
            <UserPlus className="h-4 w-4" /> {t("home.startProfile")}
          </Button>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title={t("match.title")} subtitle={t("match.subtitle", { n: eligible.length })}>
      <div className="space-y-5">
        {loading && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t("sch.loading")}</div>}

        {!loading && eligible.length === 0 && (
          <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
            <StipendiaIllustration variant="empty" className="mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{t("match.empty")}</p>
            <Button onClick={() => navigate("/profil?edit=1")} variant="outline" className="mt-3 rounded-xl">{t("match.updateProfile")}</Button>
          </div>
        )}

        <EligibilitySection title={t("match.eligibleTitle")} icon={CheckCircle2} items={eligible.slice(0, 50)} />
        <EligibilitySection title={t("match.reviewTitle")} subtitle={t("match.reviewSub")} icon={CircleHelp} items={review.slice(0, 50)} />
        <EligibilitySection title={t("match.notEligibleTitle")} subtitle={t("match.notEligibleSub")} icon={AlertCircle} items={notEligible.slice(0, 50)} />

        {hasMoreChunks && (
          <Button variant="outline" className="w-full rounded-xl" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t("sch.loading") : t("sch.loadMore")}
          </Button>
        )}
      </div>
    </AppScreen>
  );
}

function EligibilitySection({ title, subtitle, icon: Icon, items }: { title: string; subtitle?: string; icon: any; items: EligibilityItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="px-1 mb-2">
        <h2 className="font-semibold text-[15px] flex items-center gap-1.5"><Icon className="h-4 w-4 text-primary" /> {title}</h2>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">{items.map((item) => <EligibilityCard key={item.s.id} item={item} />)}</div>
    </section>
  );
}

function EligibilityCard({ item }: { item: EligibilityItem }) {
  const t = useT();
  const { s, state, reasons, blockers } = item;
  const applied = isApplied(s.id);
  const category = (s.tags ?? [])[0] ?? t("sch.studentRelevant");
  const notes = state === "eligible" ? reasons : blockers;

  return (
    <div className="p-4 bg-card rounded-2xl border border-border/70 shadow-soft transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/stipendier/${s.id}`} className="block min-w-0">
          <h3 className="font-semibold text-[15px] leading-snug hover:text-primary transition-colors">{s.name}</h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" /> {s.location || s.organization}
          </p>
        </Link>
        <div className="flex flex-col items-end gap-1">
          <EligibilityStateBadge state={state} />
          {applied && <ApplicationStateBadge applied />}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1 font-semibold"><Tag className="h-3.5 w-3.5 text-primary" />{category}</span>
        <span className="text-muted-foreground">{t("sch.externalSource")}</span>
      </div>

      {notes.length > 0 && (
        <div className="mt-3 rounded-xl bg-secondary/60 border border-border/60 p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {state === "eligible" ? t("sch.whyEligible") : t("sch.whyNot")}
          </p>
          <ul className="mt-1.5 space-y-1">
            {notes.slice(0, 3).map((note, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm" className="rounded-xl gap-1">
          <a href={externalApplicationUrl(s)} target="_blank" rel="noopener noreferrer">{t("sch.applyExternal")} <ExternalLink className="h-3.5 w-3.5" /></a>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-xl gap-1">
          <Link to={`/utkast/${s.id}`}><FileEdit className="h-3.5 w-3.5" /> {t("match.draft")}</Link>
        </Button>
      </div>
      <button
        onClick={() => toggleApplied(s.id)}
        className="mt-2 w-full text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
      >
        <Check className="h-3 w-3" /> {applied ? t("match.statusApplied") : t("sch.markApplied")}
      </button>
    </div>
  );
}
