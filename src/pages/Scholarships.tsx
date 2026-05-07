import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import {
  loadFirstScholarshipChunk,
  loadScholarshipChunk,
  loadScholarshipsByIds,
  looseIncludes,
  normalizeText,
  primaryScholarshipCategory,
  scholarshipLocationLabel,
} from "@/lib/scholarshipData";
import AppScreen from "@/components/layout/AppScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, BookmarkCheck, ChevronRight, ExternalLink, MapPin, SlidersHorizontal, Tag, X, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionLabel, useT } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { AMNESOMRADE_OPTIONS, SCHOLARSHIP_TYPES, ScholarshipType, STUDIEORT_OPTIONS } from "@/types/profile";
import { checkEligibility, scholarshipTypes } from "@/lib/eligibility";
import { loadAppliedIds, loadProfile, loadSavedIds } from "@/lib/storage";
import { ApplicationStateBadge, EligibilityBadge } from "@/components/StatusBadge";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

const RESULT_STEP = 50;

export default function Scholarships() {
  const t = useT();
  const optionLabel = useOptionLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedParam = searchParams.get("sparade");
  const [view, setView] = useState<"all" | "saved">(() => savedParam === "1" ? "saved" : "all");
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string>("");
  const [uni, setUni] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [types, setTypes] = useState<ScholarshipType[]>([]);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile());
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<Scholarship[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [index, setIndex] = useState<ScholarshipIndex | null>(null);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loadedChunkFiles, setLoadedChunkFiles] = useState<string[]>([]);
  const [nextChunk, setNextChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RESULT_STEP);

  useEffect(() => {
    setView(savedParam === "1" ? "saved" : "all");
  }, [savedParam]);

  const setBrowseView = useCallback((next: "all" | "saved") => {
    setView(next);
    setSearchParams(next === "saved" ? { sparade: "1" } : {});
  }, [setSearchParams]);

  useEffect(() => {
    const r = () => {
      setProfile(loadProfile());
      setSavedIds(loadSavedIds());
      setAppliedIds(loadAppliedIds());
    };
    r();
    window.addEventListener("stipendia:update", r);
    return () => window.removeEventListener("stipendia:update", r);
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
        setLoadedChunkFiles(index.chunks[0] ? [index.chunks[0].file] : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSavedLoading(true);
    loadScholarshipsByIds(savedIds)
      .then((items) => {
        if (!cancelled) setSavedItems(items);
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });
    return () => { cancelled = true; };
  }, [savedIds]);

  useEffect(() => setVisibleCount(RESULT_STEP), [view, query, field, uni, loc, types, eligibleOnly]);

  const loadMore = useCallback(async (batchSize = 1) => {
    if (!index || loadingMore || nextChunk >= index.chunks.length) return;
    setLoadingMore(true);
    try {
      const allFiles = index.chunks.map((chunk) => chunk.file);
      const fieldFiles = field && index.fieldChunks?.[field]?.chunks?.length ? index.fieldChunks[field].chunks : null;
      const orderedFiles = fieldFiles ?? allFiles.slice(nextChunk);
      const files = orderedFiles.filter((file) => !loadedChunkFiles.includes(file)).slice(0, batchSize);
      if (files.length === 0) return;
      const chunks = await Promise.all(files.map((file) => loadScholarshipChunk(file)));
      setItems((current) => [...current, ...chunks.flat()]);
      const nextLoaded = Array.from(new Set([...loadedChunkFiles, ...files]));
      setLoadedChunkFiles(nextLoaded);
      let sequentialIndex = nextChunk;
      while (sequentialIndex < allFiles.length && nextLoaded.includes(allFiles[sequentialIndex])) sequentialIndex += 1;
      setNextChunk(sequentialIndex);
    } finally {
      setLoadingMore(false);
    }
  }, [field, index, loadedChunkFiles, loadingMore, nextChunk]);

  const sourceItems = view === "saved" ? savedItems : items;
  const fieldOptions = useMemo(() => {
    const fromIndex = index?.fields?.filter(Boolean) ?? [];
    return fromIndex.length > 0 ? fromIndex : [...AMNESOMRADE_OPTIONS];
  }, [index]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return sourceItems.filter((s) => {
      if (query) {
        const hit = [
          s.name,
          s.organization,
          s.description,
          s.location ?? "",
          s.source?.city ?? "",
          ...(s.criteria ?? []),
          ...(s.tags ?? []),
          ...(s.targetGroup ?? []),
          ...(s.fieldOfStudy ?? []),
          ...(s.purposes ?? []),
        ].some((value) => normalizeText(value).includes(q));
        if (!hit) return false;
      }
      if (field) {
        const fields = [...(s.eligibleFields ?? []), ...(s.fieldOfStudy ?? [])];
        if (!(fields.some((f) => looseIncludes(f, field)) || looseIncludes(field, (s.tags ?? []).join(" ")))) return false;
      }
      if (uni) {
        const universityHit = [
          ...(s.eligibleUniversities ?? []),
          s.description,
          ...(s.criteria ?? []),
          ...(s.tags ?? []),
        ].some((value) => looseIncludes(value, uni));
        if (!universityHit) return false;
      }
      if (loc && !looseIncludes(s.location ?? s.source?.city ?? "", loc)) return false;
      if (types.length > 0) {
        const sTypes = scholarshipTypes(s);
        if (!types.some((tp) => sTypes.includes(tp))) return false;
      }
      if (eligibleOnly && profile) {
        if (!checkEligibility(profile, s).eligible) return false;
      }
      return true;
    });
  }, [sourceItems, query, field, uni, loc, types, eligibleOnly, profile]);

  const activeFilterCount =
    (field ? 1 : 0) + (uni ? 1 : 0) + (loc ? 1 : 0) + (types.length > 0 ? 1 : 0) + (eligibleOnly ? 1 : 0);

  const resetFilters = () => { setField(""); setUni(""); setLoc(""); setTypes([]); setEligibleOnly(false); };
  const resetSearchAndFilters = () => { setQuery(""); resetFilters(); };

  const total = view === "saved" ? savedItems.length : index?.total ?? items.length;
  const hasFilter = activeFilterCount > 0 || query.length > 0;
  const countLabel = view === "saved"
    ? t("sch.savedLoaded", { n: filtered.length, t: savedItems.length })
    : hasFilter
      ? t("sch.loadedFiltered", { n: filtered.length, l: items.length, t: total })
      : t("sch.loadedCount", { n: items.length, t: total });
  const visibleItems = filtered.slice(0, visibleCount);
  const hasMoreLoadedResults = visibleCount < filtered.length;
  const remainingChunkFiles = useMemo(() => {
    if (!index) return [];
    const fieldFiles = field && index.fieldChunks?.[field]?.chunks?.length ? index.fieldChunks[field].chunks : null;
    const candidates = fieldFiles ?? index.chunks.map((chunk) => chunk.file).slice(nextChunk);
    return candidates.filter((file) => !loadedChunkFiles.includes(file));
  }, [field, index, loadedChunkFiles, nextChunk]);
  const hasMoreChunks = view === "all" && remainingChunkFiles.length > 0;
  const isLoadingView = loading || (view === "saved" && savedLoading);
  const savedEmpty = view === "saved" && savedIds.length === 0;
  const searchMore = () => loadMore(hasFilter ? 12 : 1);

  return (
    <AppScreen title={t("sch.title")} subtitle={t("sch.subtitle")}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/70 p-1">
          <button
            onClick={() => setBrowseView("all")}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold transition-all",
              view === "all" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            )}
          >
            {t("sch.tabAll")}
          </button>
          <button
            onClick={() => setBrowseView("saved")}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold transition-all",
              view === "saved" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            )}
          >
            {t("sch.tabSaved", { n: savedIds.length })}
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("sch.searchPh")} className="pl-9 rounded-2xl h-11 bg-secondary border-transparent" />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 rounded-2xl px-3 relative shrink-0" aria-label={t("sch.filter")}>
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-left">{t("sch.filterTitle")}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 py-4">
                <FilterGroup label={t("sch.f.field")}>
                  <ChipRow options={[{ id: "", label: t("sch.f.all") }, ...fieldOptions.map((o) => ({ id: o, label: optionLabel(o) }))]} value={field} onChange={setField} />
                </FilterGroup>
                <FilterGroup label={t("sch.f.university")}>
                  <Input value={uni} onChange={(e) => setUni(e.target.value)} placeholder={t("sch.f.universityPh")} />
                </FilterGroup>
                <FilterGroup label={t("sch.f.location")}>
                  <SearchableCombobox value={loc} onChange={setLoc} options={STUDIEORT_OPTIONS as unknown as string[]} placeholder={t("sch.f.location")} />
                </FilterGroup>
                <FilterGroup label={t("sch.f.type")}>
                  <div className="flex gap-1.5 flex-wrap">
                    {SCHOLARSHIP_TYPES.map((tp) => {
                      const on = types.includes(tp);
                      return (
                        <button key={tp} onClick={() => setTypes((cur) => on ? cur.filter((x) => x !== tp) : [...cur, tp])} className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                        )}>{optionLabel(tp)}</button>
                      );
                    })}
                  </div>
                </FilterGroup>
                {profile && (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-3 py-2.5">
                    <span className="text-sm">{t("sch.f.eligibleOnly")}</span>
                    <Switch checked={eligibleOnly} onCheckedChange={setEligibleOnly} />
                  </div>
                )}
              </div>
              <SheetFooter className="flex-row gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={resetFilters}>{t("sch.f.clear")}</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setOpen(false)}>{t("sch.f.show")} {filtered.length}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <p className="px-1 text-[11px] text-muted-foreground">{countLabel}</p>
        {view === "all" && hasFilter && hasMoreChunks && (
          <p className="rounded-2xl border border-border/60 bg-secondary/50 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
            {t("sch.stepwiseHint")}
          </p>
        )}

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {field && <ActiveChip label={optionLabel(field)} onRemove={() => setField("")} />}
            {uni && <ActiveChip label={uni} onRemove={() => setUni("")} />}
            {loc && <ActiveChip label={loc} onRemove={() => setLoc("")} />}
            {types.map((tp) => <ActiveChip key={tp} label={optionLabel(tp)} onRemove={() => setTypes((c) => c.filter((x) => x !== tp))} />)}
            {eligibleOnly && <ActiveChip label={t("sch.eligible")} onRemove={() => setEligibleOnly(false)} />}
            <button onClick={resetFilters} className="text-[11px] font-semibold text-primary px-2 py-1">{t("sch.f.clear")}</button>
          </div>
        )}

        {isLoadingView ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t("sch.loading")}</div>
        ) : savedEmpty ? (
          <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
            <StipendiaIllustration variant="saved" className="mb-4" />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <Bookmark className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">{t("saved.emptyTitle")}</h2>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground leading-relaxed">{t("saved.empty")}</p>
            <Button onClick={() => setBrowseView("all")} className="mt-4 rounded-xl h-11">{t("sch.tabAll")}</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
            <StipendiaIllustration variant="empty" className="mb-4" />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mb-3">
              <SearchX className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">{t("sch.noMatchTitle")}</h2>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground leading-relaxed">{t("sch.noMatch")}</p>
            <div className="mt-4 flex flex-col gap-2">
              {hasMoreChunks && <Button variant="outline" className="rounded-xl" onClick={searchMore} disabled={loadingMore}>{loadingMore ? t("sch.loading") : t("sch.searchMore")}</Button>}
              <Button onClick={resetSearchAndFilters} variant="ghost" className="rounded-xl">{t("sch.f.clear")}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {visibleItems.map((s) => (
                <BrowseCard
                  key={s.id}
                  scholarship={s}
                  profile={profile}
                  saved={savedIds.includes(s.id)}
                  applied={appliedIds.includes(s.id)}
                />
              ))}
            </div>
            <div className="space-y-2">
              {hasMoreLoadedResults && <Button variant="outline" className="w-full rounded-xl" onClick={() => setVisibleCount((count) => count + RESULT_STEP)}>{t("sch.loadMore")}</Button>}
              {!hasMoreLoadedResults && hasMoreChunks && (
                <Button variant="outline" className="w-full rounded-xl" onClick={searchMore} disabled={loadingMore}>
                  {loadingMore ? t("sch.loading") : hasFilter ? t("sch.searchMore") : t("sch.loadMore")}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </AppScreen>
  );
}

function BrowseCard({
  scholarship: s,
  profile,
  saved,
  applied,
}: {
  scholarship: Scholarship;
  profile: ReturnType<typeof loadProfile>;
  saved: boolean;
  applied: boolean;
}) {
  const t = useT();
  const eligible = profile ? checkEligibility(profile, s).eligible : null;
  const category = primaryScholarshipCategory(s) ?? t("sch.studentRelevant");
  const location = scholarshipLocationLabel(s);
  return (
    <Link to={`/stipendier/${s.id}`} className="group block rounded-[26px] border border-border/70 bg-card p-4 shadow-soft transition-all active:scale-[0.99] hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-[15px] leading-snug tracking-tight group-hover:text-primary transition-colors">{s.name}</h3>
          {location && (
            <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/75" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {eligible !== null && <EligibilityBadge eligible={eligible} />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <MetaPill icon={Tag} label={category} tone="primary" />
        <MetaPill icon={ExternalLink} label={t("sch.externalSourceShort")} />
        {saved && <MetaPill icon={BookmarkCheck} label={t("nav.saved")} tone="success" />}
        {applied && <ApplicationStateBadge applied />}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-[12px] font-semibold text-muted-foreground">{t("sch.cardHint")}</span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
          {t("sch.details")} <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function MetaPill({ icon: Icon, label, tone = "neutral" }: { icon: any; label: string; tone?: "neutral" | "primary" | "success" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
      tone === "primary" && "border-primary/20 bg-primary-soft text-primary",
      tone === "success" && "border-success/20 bg-success-soft text-success",
      tone === "neutral" && "border-border/70 bg-secondary/65 text-muted-foreground"
    )}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
function ChipRow({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
          value === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
        )}>{o.label}</button>
      ))}
    </div>
  );
}
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-[11px] font-semibold">
      {label}
      <button onClick={onRemove} aria-label="x" className="hover:opacity-70"><X className="h-3 w-3" /></button>
    </span>
  );
}
