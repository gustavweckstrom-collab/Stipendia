import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import { externalApplicationUrl, loadFirstScholarshipChunk, loadScholarshipChunk } from "@/lib/scholarshipData";
import { checkEligibility } from "@/lib/eligibility";
import { loadProfile, isApplied, toggleApplied } from "@/lib/storage";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Sparkles, Building2, CheckCircle2, FileEdit, ExternalLink, UserPlus, Check, Tag } from "lucide-react";
import { StudentProfile } from "@/types/profile";
import { useT } from "@/lib/i18n";
import { EligibilityBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";

export default function Matches() {
  const t = useT();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [showAll, setShowAll] = useState(false);
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

  const matchedItems = useMemo(() => {
    if (!profile) return [] as { s: Scholarship; eligible: boolean; reasons: string[]; blockers: string[] }[];
    return items.map((s) => {
      const r = checkEligibility(profile, s);
      return { s, eligible: r.eligible, reasons: r.reasons, blockers: r.blockers };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible));
  }, [profile, items]);

  const eligible = matchedItems.filter((i) => i.eligible);
  const notEligible = matchedItems.filter((i) => !i.eligible);
  const hasMoreChunks = Boolean(index && nextChunk < index.chunks.length);

  if (!profile) {
    return (
      <AppScreen title={t("match.title")}>
        <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent-soft text-accent-foreground flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7" />
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
      <div className="space-y-4">
        {loading && <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t("sch.loading")}</div>}

        {!loading && eligible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("match.empty")}</p>
            <Button onClick={() => navigate("/profil?edit=1")} variant="outline" className="mt-3 rounded-xl">{t("match.updateProfile")}</Button>
          </div>
        )}

        <div className="space-y-2.5">{eligible.slice(0, 50).map((i) => <MatchCard key={i.s.id} item={i} />)}</div>

        {notEligible.length > 0 && (
          <div className="flex items-center justify-between bg-card rounded-2xl border border-border/60 px-3 py-2.5">
            <span className="text-sm">{t("match.showAll")}</span>
            <Switch checked={showAll} onCheckedChange={setShowAll} />
          </div>
        )}

        {showAll && notEligible.length > 0 && (
          <section>
            <div className="px-1 mb-2">
              <h2 className="font-semibold text-[15px]">{t("match.notEligibleTitle")}</h2>
              <p className="text-[12px] text-muted-foreground">{t("match.notEligibleSub")}</p>
            </div>
            <div className="space-y-2.5">{notEligible.slice(0, 50).map((i) => <MatchCard key={i.s.id} item={i} />)}</div>
          </section>
        )}

        {hasMoreChunks && (
          <Button variant="outline" className="w-full rounded-xl" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t("sch.loading") : t("sch.loadMore")}
          </Button>
        )}
      </div>
    </AppScreen>
  );
}

function MatchCard({ item }: { item: { s: Scholarship; eligible: boolean; reasons: string[]; blockers: string[] } }) {
  const t = useT();
  const { s, eligible, reasons } = item;
  const applied = isApplied(s.id);
  const category = (s.tags ?? [])[0] ?? t("sch.studentRelevant");

  return (
    <div className="p-4 bg-card rounded-2xl border border-border/70 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/stipendier/${s.id}`} className="block min-w-0">
          <h3 className="font-semibold text-[15px] leading-snug hover:text-primary transition-colors">{s.name}</h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" /> {s.location || s.organization}
          </p>
        </Link>
        <EligibilityBadge eligible={eligible} />
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1 font-semibold"><Tag className="h-3.5 w-3.5 text-primary" />{category}</span>
        <span className="text-muted-foreground">{t("sch.externalSource")}</span>
      </div>

      {eligible && reasons.length > 0 && (
        <div className="mt-3 rounded-xl bg-primary-soft/60 border border-primary/10 p-2.5">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {t("sch.whyEligible")}
          </p>
          <ul className="mt-1.5 space-y-1">
            {reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>{reason}</span>
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
        <Check className="h-3 w-3" /> {applied ? t("sch.unmarkApplied") : t("sch.markApplied")}
      </button>
    </div>
  );
}
