import { useTagTranslator } from "@/lib/tagTranslator";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import {
  loadFirstScholarshipChunk,
  loadScholarshipChunk,
  loadScholarshipsByIds,
  looseIncludes,
  normalizeText,
  eligibilityHighlights,
  hasDirectApplicationTarget,
  primaryScholarshipCategory,
  scholarshipMatchesEducationLevel,
  scholarshipMatchesStudyAbroad,
  scholarshipMatchesTravel,
  scholarshipSearchFields,
  scholarshipLocationLabel,
} from "@/lib/scholarshipData";
import AppScreen from "@/components/layout/AppScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, BookmarkCheck, CheckCircle2, ChevronRight, ExternalLink, GraduationCap, MapPin, Plane, SlidersHorizontal, Tag, X, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionLabel, useT } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { AMNESOMRADE_OPTIONS, EDUCATION_LEVEL_OPTIONS, HEMORT_SUGGESTIONS, SCHOLARSHIP_TYPES, ScholarshipType, STUDIEORT_OPTIONS, UNIVERSITET_OPTIONS } from "@/types/profile";
import { checkEligibility, scholarshipTypes } from "@/lib/eligibility";
import { loadAppliedIds, loadProfile, loadSavedIds } from "@/lib/storage";
import { ApplicationStateBadge, EligibilityBadge } from "@/components/StatusBadge";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

const RESULT_STEP = 50;
const FILTER_EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVEL_OPTIONS;

type ScholarshipFilters = {
  query: string;
  field: string;
  uni: string;
  birthPlace: string;
  residencePlace: string;
  loc: string;
  educationLevel: string;
  travelOnly: boolean;
  types: ScholarshipType[];
  eligibleOnly: boolean;
  profile: ReturnType<typeof loadProfile>;
};

function scholarshipHasText(s: Scholarship, value: string) {
  if (!value.trim()) return true;
  const needle = normalizeText(value);
  return scholarshipSearchFields(s).some((text) => normalizeText(text).includes(needle));
}

function scholarshipMatchesFilters(s: Scholarship, filters: ScholarshipFilters) {
  const q = normalizeText(filters.query);
  if (filters.query) {
    const hit = scholarshipSearchFields(s).some((value) => normalizeText(value).includes(q));
    if (!hit) return false;
  }
  if (filters.field) {
    const fields = [...(s.eligibleFields ?? []), ...(s.fieldOfStudy ?? [])];
    if (!(fields.some((f) => looseIncludes(f, filters.field)) || looseIncludes(filters.field, (s.tags ?? []).join(" ")))) return false;
  }
  if (filters.uni) {
    const universityHit = [
      ...(s.eligibleUniversities ?? []),
      s.description,
      ...(s.criteria ?? []),
      ...(s.tags ?? []),
    ].some((value) => looseIncludes(value, filters.uni));
    if (!universityHit) return false;
  }
  if (filters.birthPlace && !scholarshipHasText(s, filters.birthPlace)) return false;
  if (filters.residencePlace && !scholarshipHasText(s, filters.residencePlace)) return false;
  if (filters.loc && !scholarshipHasText(s, filters.loc)) return false;
  if (filters.educationLevel && !scholarshipMatchesEducationLevel(s, filters.educationLevel)) return false;
  if (filters.travelOnly && !scholarshipMatchesTravel(s)) return false;
  if (filters.types.length > 0) {
    const sTypes = scholarshipTypes(s);
    if (!filters.types.some((tp) => sTypes.includes(tp))) return false;
  }
  if (filters.eligibleOnly && filters.profile) {
    if (!checkEligibility(filters.profile, s).eligible) return false;
  }
  return true;
}

export default function Scholarships() {
  const t = useT();
  const optionLabel = useOptionLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedParam = searchParams.get("sparade");
  const [view, setView] = useState<"all" | "saved">(() => savedParam === "1" ? "saved" : "all");
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string>("");
  const [uni, setUni] = useState<string>("");
  const [birthPlace, setBirthPlace] = useState<string>("");
  const [residencePlace, setResidencePlace] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [travelOnly, setTravelOnly] = useState(false);
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
  const [datasetMatches, setDatasetMatches] = useState<Scholarship[]>([]);
  const [datasetMatchTotal, setDatasetMatchTotal] = useState(0);
  const [datasetScanning, setDatasetScanning] = useState(false);
  const [datasetScannedChunks, setDatasetScannedChunks] = useState(0);

  useEffect(() => {
    setView(savedParam === "1" ? "saved" : "all");
  }, [savedParam]);

  useEffect(() => {
    const typeParam = searchParams.get("typ");
    const validTypes = SCHOLARSHIP_TYPES.filter((type) => typeParam === type);
    setQuery(searchParams.get("q") ?? "");
    setField(searchParams.get("falt") ?? "");
    setUni(searchParams.get("universitet") ?? "");
    setBirthPlace(searchParams.get("fodelseort") ?? "");
    setResidencePlace(searchParams.get("bostadsort") ?? "");
    setLoc(searchParams.get("studieort") ?? "");
    setEducationLevel(searchParams.get("niva") ?? "");
    setTravelOnly(searchParams.get("resa") === "1");
    setTypes(validTypes);
  }, [searchParams]);

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

  useEffect(() => setVisibleCount(RESULT_STEP), [view, query, field, uni, birthPlace, residencePlace, loc, educationLevel, travelOnly, types, eligibleOnly]);

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

  const activeFilterCount =
    (field ? 1 : 0) + (uni ? 1 : 0) + (birthPlace ? 1 : 0) + (residencePlace ? 1 : 0) + (loc ? 1 : 0) +
    (educationLevel ? 1 : 0) + (travelOnly ? 1 : 0) + (types.length > 0 ? 1 : 0) + (eligibleOnly ? 1 : 0);
  const hasSearchOrFilter = query.trim().length > 0 || activeFilterCount > 0;
  const datasetFilterActive = view === "all" && hasSearchOrFilter;

  const filters = useMemo<ScholarshipFilters>(() => ({
    query,
    field,
    uni,
    birthPlace,
    residencePlace,
    loc,
    educationLevel,
    travelOnly,
    types,
    eligibleOnly,
    profile,
  }), [query, field, uni, birthPlace, residencePlace, loc, educationLevel, travelOnly, types, eligibleOnly, profile]);

  const localFiltered = useMemo(() => sourceItems.filter((s) => scholarshipMatchesFilters(s, filters)), [sourceItems, filters]);

  useEffect(() => {
    if (!datasetFilterActive || !index) {
      setDatasetMatches([]);
      setDatasetMatchTotal(0);
      setDatasetScanning(false);
      setDatasetScannedChunks(0);
      return;
    }

    let cancelled = false;
    const scan = async () => {
      setDatasetScanning(true);
      setDatasetScannedChunks(0);
      setDatasetMatchTotal(0);
      setDatasetMatches([]);
      const allFiles = index.chunks.map((chunk) => chunk.file);
      const candidateFiles = field && index.fieldChunks?.[field]?.chunks?.length ? index.fieldChunks[field].chunks : allFiles;
      const matches: Scholarship[] = [];
      let totalMatches = 0;

      for (let i = 0; i < candidateFiles.length; i += 1) {
        const chunk = await loadScholarshipChunk(candidateFiles[i]);
        if (cancelled) return;
        for (const scholarship of chunk) {
          if (scholarshipMatchesFilters(scholarship, filters)) {
            totalMatches += 1;
            if (matches.length < visibleCount) matches.push(scholarship);
          }
        }
        if (cancelled) return;
        setDatasetMatches([...matches]);
        setDatasetMatchTotal(totalMatches);
        setDatasetScannedChunks(i + 1);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      if (!cancelled) {
        setDatasetScanning(false);
      }
    };

    scan().catch(() => {
      if (!cancelled) {
        setDatasetScanning(false);
      }
    });

    return () => { cancelled = true; };
  }, [datasetFilterActive, field, filters, index, visibleCount]);

  const resetFilters = () => {
    setField("");
    setUni("");
    setBirthPlace("");
    setResidencePlace("");
    setLoc("");
    setEducationLevel("");
    setTravelOnly(false);
    setTypes([]);
    setEligibleOnly(false);
  };
  const resetSearchAndFilters = () => { setQuery(""); resetFilters(); };

  const filtered = datasetFilterActive ? datasetMatches : localFiltered;
  const total = view === "saved" ? savedItems.length : index?.total ?? items.length;
  const hasFilter = hasSearchOrFilter;
  const countLabel = view === "saved"
    ? t("sch.savedLoaded", { n: filtered.length, t: savedItems.length })
    : datasetFilterActive
      ? datasetScanning
        ? t("sch.filteredScanning", { n: datasetMatchTotal, c: datasetScannedChunks, t: index?.chunks.length ?? 0 })
        : t("sch.filteredTotal", { n: filtered.length, t: datasetMatchTotal })
      : t("sch.loadedCount", { n: items.length, t: total });
  const visibleItems = datasetFilterActive ? filtered : filtered.slice(0, visibleCount);
  const hasMoreLoadedResults = datasetFilterActive ? filtered.length < datasetMatchTotal : visibleCount < filtered.length;
  const filterSheetCount = datasetFilterActive ? datasetMatchTotal : filtered.length;
  const remainingChunkFiles = useMemo(() => {
    if (!index) return [];
    const fieldFiles = field && index.fieldChunks?.[field]?.chunks?.length ? index.fieldChunks[field].chunks : null;
    const candidates = fieldFiles ?? index.chunks.map((chunk) => chunk.file).slice(nextChunk);
    return candidates.filter((file) => !loadedChunkFiles.includes(file));
  }, [field, index, loadedChunkFiles, nextChunk]);
  const hasMoreChunks = !datasetFilterActive && view === "all" && remainingChunkFiles.length > 0;
  const isLoadingView = loading || (view === "saved" && savedLoading) || (datasetFilterActive && datasetScanning && filtered.length === 0);
  const savedEmpty = view === "saved" && savedIds.length === 0;

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
              <Button variant="outline" className="h-12 rounded-2xl px-4 gap-2 relative shrink-0 border-primary/20 bg-card shadow-soft hover:shadow-card" aria-label={t("sch.filterButton")}>
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t("sch.filterButton")}</span>
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
                <FilterSection title={t("sch.f.geoGroup")} description={t("sch.f.geoHelp")}>
                  <div className="grid gap-3">
                    <FilterGroup label={t("sch.f.birthPlace")}>
                      <SearchableCombobox value={birthPlace} onChange={setBirthPlace} options={HEMORT_SUGGESTIONS as unknown as string[]} placeholder={t("sch.f.birthPlacePh")} />
                    </FilterGroup>
                    <FilterGroup label={t("sch.f.residencePlace")}>
                      <SearchableCombobox value={residencePlace} onChange={setResidencePlace} options={HEMORT_SUGGESTIONS as unknown as string[]} placeholder={t("sch.f.residencePlacePh")} />
                    </FilterGroup>
                    <FilterGroup label={t("sch.f.studyPlace")}>
                      <SearchableCombobox value={loc} onChange={setLoc} options={STUDIEORT_OPTIONS as unknown as string[]} placeholder={t("sch.f.studyPlacePh")} />
                    </FilterGroup>
                  </div>
                </FilterSection>

                <FilterSection title={t("sch.f.studiesGroup")}>
                  <div className="grid gap-4">
                    <FilterGroup label={t("sch.f.university")}>
                      <SearchableCombobox value={uni} onChange={setUni} options={UNIVERSITET_OPTIONS as unknown as string[]} placeholder={t("sch.f.universityPh")} maxResults={10} />
                    </FilterGroup>
                    <FilterGroup label={t("sch.f.field")}>
                      <ChipRow options={[{ id: "", label: t("sch.f.all") }, ...fieldOptions.map((o) => ({ id: o, label: optionLabel(o) }))]} value={field} onChange={setField} />
                    </FilterGroup>
                    <FilterGroup label={t("sch.f.educationLevel")}>
                      <ChipRow options={[{ id: "", label: t("sch.f.all") }, ...FILTER_EDUCATION_LEVEL_OPTIONS.map((o) => ({ id: o, label: optionLabel(o) }))]} value={educationLevel} onChange={setEducationLevel} />
                    </FilterGroup>
                  </div>
                </FilterSection>

                <FilterSection title={t("sch.f.typeGroup")}>
                  <div className="flex gap-1.5 flex-wrap">
                    <ToggleChip active={travelOnly} onClick={() => setTravelOnly((value) => !value)} label={t("sch.f.travel")} icon={Plane} />
                    {SCHOLARSHIP_TYPES.map((tp) => {
                      const on = types.includes(tp);
                      return (
                        <button key={tp} onClick={() => setTypes((cur) => on ? cur.filter((x) => x !== tp) : [...cur, tp])} className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                          on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                        )}>
                          {tp === "Utlandsstudier" && <Plane className="h-3.5 w-3.5" />}
                          {optionLabel(tp)}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
                {profile && (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-3 py-2.5">
                    <span className="text-sm">{t("sch.f.eligibleOnly")}</span>
                    <Switch checked={eligibleOnly} onCheckedChange={setEligibleOnly} />
                  </div>
                )}
              </div>
              <SheetFooter className="flex-row gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={resetFilters}>{t("sch.f.clear")}</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setOpen(false)}>{t("sch.f.show")} {filterSheetCount}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <p className="px-1 text-[11px] text-muted-foreground">{countLabel}</p>
        {view === "all" && hasFilter && (datasetFilterActive || hasMoreChunks) && (
          <p className="rounded-2xl border border-border/60 bg-secondary/50 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
            {t("sch.stepwiseHint")}
          </p>
        )}

        {hasSearchOrFilter && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {query && <ActiveChip label={`${t("sch.searchLabel")}: ${query}`} onRemove={() => setQuery("")} />}
            {field && <ActiveChip label={optionLabel(field)} onRemove={() => setField("")} />}
            {uni && <ActiveChip label={uni} onRemove={() => setUni("")} />}
            {birthPlace && <ActiveChip label={`${t("sch.f.birthPlace")}: ${birthPlace}`} onRemove={() => setBirthPlace("")} />}
            {residencePlace && <ActiveChip label={`${t("sch.f.residencePlace")}: ${residencePlace}`} onRemove={() => setResidencePlace("")} />}
            {loc && <ActiveChip label={loc} onRemove={() => setLoc("")} />}
            {educationLevel && <ActiveChip label={optionLabel(educationLevel)} onRemove={() => setEducationLevel("")} />}
            {travelOnly && <ActiveChip label={t("sch.f.travel")} onRemove={() => setTravelOnly(false)} />}
            {types.map((tp) => <ActiveChip key={tp} label={optionLabel(tp)} onRemove={() => setTypes((c) => c.filter((x) => x !== tp))} />)}
            {eligibleOnly && <ActiveChip label={t("sch.eligible")} onRemove={() => setEligibleOnly(false)} />}
            {activeFilterCount > 0 && <button onClick={resetFilters} className="text-[11px] font-semibold text-primary px-2 py-1">{t("sch.f.clear")}</button>}
            {query && activeFilterCount > 0 && <button onClick={resetSearchAndFilters} className="text-[11px] font-semibold text-muted-foreground px-2 py-1">{t("sch.f.clearAll")}</button>}
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
              <Button onClick={resetSearchAndFilters} variant="ghost" className="rounded-xl">{t("sch.f.clearAll")}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
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
              {hasMoreLoadedResults && <Button variant="outline" className="w-full rounded-xl" onClick={() => setVisibleCount((count) => count + RESULT_STEP)} disabled={datasetFilterActive && datasetScanning}>{datasetFilterActive && datasetScanning ? t("sch.loading") : t("sch.loadMore")}</Button>}
              {!hasMoreLoadedResults && hasMoreChunks && (
                <Button variant="outline" className="w-full rounded-xl" onClick={async () => { await loadMore(1); setVisibleCount((count) => count + RESULT_STEP); }} disabled={loadingMore}>
                  {loadingMore ? t("sch.loading") : t("sch.loadMore")}
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
  const translateTag = useTagTranslator();
  const eligible = profile ? checkEligibility(profile, s).eligible : null;
  const category = primaryScholarshipCategory(s) ?? t("sch.studentRelevant");
  const location = scholarshipLocationLabel(s);
  const highlights = eligibilityHighlights(s).slice(0, 3);
  const directApplication = hasDirectApplicationTarget(s);
  const isTravel = scholarshipMatchesTravel(s);
  const isStudyAbroad = scholarshipMatchesStudyAbroad(s);
  const hasGeoConnection = highlights.some((point) => normalizeText(point).includes("ort") || normalizeText(point).includes("region") || normalizeText(point).includes("local"));
  return (
    <Link to={`/stipendier/${s.id}`} className="group block rounded-[28px] border border-border/70 bg-card p-5 shadow-soft transition-all active:scale-[0.99] hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-[16px] leading-snug tracking-tight group-hover:text-primary transition-colors">{s.name}</h3>
          {location && (
            <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
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
        <MetaPill icon={Tag} label={translateTag(category)} tone="primary" />
        {isTravel && <MetaPill icon={Plane} label={t("sch.travelBadge")} tone="primary" />}
        {isStudyAbroad && <MetaPill icon={Plane} label={t("sch.studyAbroadBadge")} tone="primary" />}
        {hasGeoConnection && <MetaPill icon={MapPin} label={t("sch.geoBadge")} />}
        <MetaPill icon={GraduationCap} label={t("sch.studentRelevantShort")} tone="success" />
        {!directApplication && <MetaPill icon={ExternalLink} label={t("sch.externalSourceShort")} />}
        {saved && <MetaPill icon={BookmarkCheck} label={t("nav.saved")} tone="success" />}
        {applied && <ApplicationStateBadge applied />}
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/45 px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("sch.cardEligibility")}</p>
        <ul className="space-y-1">
          {highlights.map((point) => (
            <li key={point} className="flex gap-1.5 text-[12px] leading-snug text-foreground/80">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
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

function FilterSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/35 p-3.5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
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
        <button key={o.id} onClick={() => onChange(value === o.id ? "" : o.id)} className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
          value === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
        )}>{o.label}</button>
      ))}
    </div>
  );
}
function ToggleChip({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: any }) {
  return (
    <button onClick={onClick} className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
    )}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
