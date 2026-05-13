import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTagTranslator } from "@/lib/tagTranslator";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  scholarshipLocationLabel,
  scholarshipMatchesSearchValue,
  scholarshipSearchHaystack,
  scholarshipSearchRelationReasons,
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
import { checkEligibility, eligibilityState, scholarshipTypes } from "@/lib/eligibility";
import { loadAppliedIds, loadPersonalDeadlines, loadProfile, loadSavedIds, PersonalDeadline } from "@/lib/storage";
import { ApplicationStateBadge, EligibilityStateBadge } from "@/components/StatusBadge";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";
import { PersonalDeadlineQuickEdit } from "@/components/PersonalDeadline";

// Keep list rendering capped to one mobile-friendly batch at a time.
const RESULT_STEP = 50;
const FILTER_EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVEL_OPTIONS;
const TYPE_PARAM = "typ";
type BrowseView = "all" | "saved" | "applied";

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

function parseScholarshipTypes(params: URLSearchParams): ScholarshipType[] {
  const values = params.getAll(TYPE_PARAM);
  return SCHOLARSHIP_TYPES.filter((type) => values.includes(type));
}

function buildScholarshipParams({
  view,
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
}: {
  view: BrowseView;
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
}) {
  const params = new URLSearchParams();
  if (view === "saved") params.set("sparade", "1");
  if (view === "applied") params.set("sokta", "1");
  if (query.trim()) params.set("q", query.trim());
  if (field) params.set("falt", field);
  if (uni.trim()) params.set("universitet", uni.trim());
  if (birthPlace.trim()) params.set("fodelseort", birthPlace.trim());
  if (residencePlace.trim()) params.set("bostadsort", residencePlace.trim());
  if (loc.trim()) params.set("studieort", loc.trim());
  if (educationLevel) params.set("niva", educationLevel);
  if (travelOnly) params.set("resa", "1");
  types.forEach((type) => params.append(TYPE_PARAM, type));
  if (eligibleOnly) params.set("behorig", "1");
  return params;
}

function sameScholarshipTypes(a: ScholarshipType[], b: ScholarshipType[]) {
  return a.length === b.length && a.every((type) => b.includes(type));
}

function parseBrowseView(params: URLSearchParams): BrowseView {
  if (params.get("sparade") === "1") return "saved";
  if (params.get("sokta") === "1") return "applied";
  return "all";
}

function scholarshipHasText(s: Scholarship, value: string) {
  return scholarshipMatchesSearchValue(s, value);
}

function scholarshipMatchesFilters(s: Scholarship, filters: ScholarshipFilters) {
  const q = normalizeText(filters.query);
  if (filters.query) {
    const hit = scholarshipMatchesSearchValue(s, q);
    if (!hit) return false;
  }
  if (filters.field) {
    const fields = [...(s.eligibleFields ?? []), ...(s.fieldOfStudy ?? [])];
    if (!(fields.some((f) => looseIncludes(f, filters.field)) || looseIncludes(filters.field, (s.tags ?? []).join(" ")))) return false;
  }
  if (filters.uni) {
    const universityHit = scholarshipMatchesSearchValue(s, filters.uni);
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

function scholarshipResultScore(s: Scholarship, filters: ScholarshipFilters) {
  const query = normalizeText(filters.query);
  const haystack = scholarshipSearchHaystack(s);
  let score = 0;
  if (query) {
    const name = normalizeText(s.name);
    if (name === query) score += 90;
    else if (name.includes(query)) score += 60;
    else if (haystack.includes(query)) score += 20;
  }
  if (filters.field && [...(s.eligibleFields ?? []), ...(s.fieldOfStudy ?? [])].some((field) => looseIncludes(field, filters.field))) score += 35;
  if (filters.uni && (s.eligibleUniversities ?? []).some((uni) => looseIncludes(uni, filters.uni))) score += 35;
  if (filters.loc && scholarshipMatchesSearchValue(s, filters.loc)) score += 20;
  if (filters.birthPlace && scholarshipMatchesSearchValue(s, filters.birthPlace)) score += 15;
  if (filters.residencePlace && scholarshipMatchesSearchValue(s, filters.residencePlace)) score += 15;
  if ((s.targetGroup ?? []).some((group) => normalizeText(group).includes("student"))) score += 12;
  if ((s.criteria ?? []).length > 0 || (s.targetGroup ?? []).length > 0) score += 6;
  if (scholarshipMatchesTravel(s)) score += filters.travelOnly ? 20 : 3;
  if (/(doktorand|forskarutbildning|forskningsprojekt|postdok|professor|gymnasieelev|grundskoleelev|forening|foretag)/i.test(haystack)) score -= 18;
  return score;
}

export default function Scholarships() {
  const t = useT();
  const optionLabel = useOptionLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  const syncingFromUrl = useRef(false);
  const [view, setView] = useState<BrowseView>(() => parseBrowseView(searchParams));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [field, setField] = useState<string>(() => searchParams.get("falt") ?? "");
  const [uni, setUni] = useState<string>(() => searchParams.get("universitet") ?? "");
  const [birthPlace, setBirthPlace] = useState<string>(() => searchParams.get("fodelseort") ?? "");
  const [residencePlace, setResidencePlace] = useState<string>(() => searchParams.get("bostadsort") ?? "");
  const [loc, setLoc] = useState<string>(() => searchParams.get("studieort") ?? "");
  const [educationLevel, setEducationLevel] = useState<string>(() => searchParams.get("niva") ?? "");
  const [travelOnly, setTravelOnly] = useState(() => searchParams.get("resa") === "1");
  const [types, setTypes] = useState<ScholarshipType[]>(() => parseScholarshipTypes(searchParams));
  const [eligibleOnly, setEligibleOnly] = useState(() => searchParams.get("behorig") === "1");
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile());
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, PersonalDeadline>>({});
  const [savedItems, setSavedItems] = useState<Scholarship[]>([]);
  const [appliedItems, setAppliedItems] = useState<Scholarship[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [appliedLoading, setAppliedLoading] = useState(false);
  const [index, setIndex] = useState<ScholarshipIndex | null>(null);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loadedChunkFiles, setLoadedChunkFiles] = useState<string[]>([]);
  const [nextChunk, setNextChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [datasetMatches, setDatasetMatches] = useState<Scholarship[]>([]);
  const [datasetMatchTotal, setDatasetMatchTotal] = useState(0);
  const [datasetScanning, setDatasetScanning] = useState(false);
  const [datasetScannedChunks, setDatasetScannedChunks] = useState(0);

  useEffect(() => {
    syncingFromUrl.current = true;
    setQuery(searchParams.get("q") ?? "");
    setField(searchParams.get("falt") ?? "");
    setUni(searchParams.get("universitet") ?? "");
    setBirthPlace(searchParams.get("fodelseort") ?? "");
    setResidencePlace(searchParams.get("bostadsort") ?? "");
    setLoc(searchParams.get("studieort") ?? "");
    setEducationLevel(searchParams.get("niva") ?? "");
    setTravelOnly(searchParams.get("resa") === "1");
    setEligibleOnly(searchParams.get("behorig") === "1");
    setView(parseBrowseView(searchParams));
    const validTypes = parseScholarshipTypes(searchParams);
    setTypes((current) => sameScholarshipTypes(current, validTypes) ? current : validTypes);
  }, [searchParamString]);

  useEffect(() => {
    if (syncingFromUrl.current) {
      syncingFromUrl.current = false;
      return;
    }

    const nextParams = buildScholarshipParams({
      view,
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
    });

    if (nextParams.toString() !== searchParamString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [birthPlace, educationLevel, eligibleOnly, field, loc, query, residencePlace, searchParamString, setSearchParams, travelOnly, types, uni, view]);

  const setBrowseView = useCallback((next: BrowseView) => {
    setView(next);
  }, []);

  useEffect(() => {
    const r = () => {
      setProfile(loadProfile());
      setSavedIds(loadSavedIds());
      setAppliedIds(loadAppliedIds());
      setDeadlines(loadPersonalDeadlines());
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

  useEffect(() => {
    let cancelled = false;
    setAppliedLoading(true);
    loadScholarshipsByIds(appliedIds)
      .then((items) => {
        if (!cancelled) setAppliedItems(items);
      })
      .finally(() => {
        if (!cancelled) setAppliedLoading(false);
      });
    return () => { cancelled = true; };
  }, [appliedIds]);

  useEffect(() => setResultPage(0), [view, query, field, uni, birthPlace, residencePlace, loc, educationLevel, travelOnly, types, eligibleOnly]);

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

  const sourceItems = view === "saved" ? savedItems : view === "applied" ? appliedItems : items;
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

  const localFiltered = useMemo(() => sourceItems
    .filter((s) => scholarshipMatchesFilters(s, filters))
    .sort((a, b) =>
      scholarshipResultScore(b, filters) - scholarshipResultScore(a, filters) ||
      a.name.localeCompare(b.name, "sv")
    ), [sourceItems, filters]);

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
      const pageStart = resultPage * RESULT_STEP;
      const pageEnd = pageStart + RESULT_STEP;
      const updatePageMatches = () => {
        const ranked = [...matches].sort((a, b) =>
          scholarshipResultScore(b, filters) - scholarshipResultScore(a, filters) ||
          a.name.localeCompare(b.name, "sv")
        );
        setDatasetMatches(ranked.slice(pageStart, pageEnd));
      };

      for (let i = 0; i < candidateFiles.length; i += 1) {
        const chunk = await loadScholarshipChunk(candidateFiles[i]);
        if (cancelled) return;
        for (const scholarship of chunk) {
          if (scholarshipMatchesFilters(scholarship, filters)) {
            totalMatches += 1;
            matches.push(scholarship);
          }
        }
        if (cancelled) return;
        updatePageMatches();
        setDatasetMatchTotal(totalMatches);
        setDatasetScannedChunks(i + 1);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      if (!cancelled) {
        updatePageMatches();
        setDatasetScanning(false);
      }
    };

    scan().catch(() => {
      if (!cancelled) {
        setDatasetScanning(false);
      }
    });

    return () => { cancelled = true; };
  }, [datasetFilterActive, field, filters, index, resultPage]);

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
  const total = view === "saved" ? savedItems.length : view === "applied" ? appliedItems.length : index?.total ?? items.length;
  const hasFilter = hasSearchOrFilter;
  const resultStart = resultPage * RESULT_STEP;
  const visibleItems = datasetFilterActive ? filtered : filtered.slice(resultStart, resultStart + RESULT_STEP);
  const totalForRange = view === "saved"
    ? (hasSearchOrFilter ? localFiltered.length : savedItems.length)
    : view === "applied"
      ? (hasSearchOrFilter ? localFiltered.length : appliedItems.length)
    : datasetFilterActive
      ? datasetMatchTotal
      : total;
  const rangeFrom = totalForRange === 0 || visibleItems.length === 0 ? 0 : resultStart + 1;
  const rangeTo = totalForRange === 0 || visibleItems.length === 0 ? 0 : Math.min(resultStart + visibleItems.length, totalForRange);
  const countLabel = datasetFilterActive && datasetScanning
    ? t("sch.filteredScanning", { n: datasetMatchTotal, c: datasetScannedChunks, t: index?.chunks.length ?? 0 })
    : t("sch.resultRange", { from: rangeFrom, to: rangeTo, t: totalForRange });
  const filterSheetCount = datasetFilterActive ? datasetMatchTotal : filtered.length;
  const remainingChunkFiles = useMemo(() => {
    if (!index) return [];
    const fieldFiles = field && index.fieldChunks?.[field]?.chunks?.length ? index.fieldChunks[field].chunks : null;
    const candidates = fieldFiles ?? index.chunks.map((chunk) => chunk.file).slice(nextChunk);
    return candidates.filter((file) => !loadedChunkFiles.includes(file));
  }, [field, index, loadedChunkFiles, nextChunk]);
  const hasMoreChunks = !datasetFilterActive && view === "all" && remainingChunkFiles.length > 0;
  const hasNextBatch = datasetFilterActive
    ? resultStart + RESULT_STEP < datasetMatchTotal
    : resultStart + RESULT_STEP < localFiltered.length || hasMoreChunks;
  const goToNextBatch = async () => {
    const nextStart = (resultPage + 1) * RESULT_STEP;
    if (!datasetFilterActive && view === "all" && nextStart >= localFiltered.length && hasMoreChunks) {
      await loadMore(1);
    }
    setResultPage((page) => page + 1);
  };
  const isLoadingView = loading || (view === "saved" && savedLoading) || (view === "applied" && appliedLoading) || (datasetFilterActive && datasetScanning && filtered.length === 0);
  const savedEmpty = view === "saved" && savedIds.length === 0;
  const appliedEmpty = view === "applied" && appliedIds.length === 0;

  return (
    <AppScreen title={t("sch.title")} subtitle={t("sch.subtitle")}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-secondary/70 p-1">
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
          <button
            onClick={() => setBrowseView("applied")}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold transition-all",
              view === "applied" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            )}
          >
            {t("sch.tabApplied", { n: appliedIds.length })}
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
        ) : appliedEmpty ? (
          <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
            <StipendiaIllustration variant="empty" className="mb-4" />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-success-soft text-success flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">{t("sch.appliedEmptyTitle")}</h2>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground leading-relaxed">{t("sch.appliedEmpty")}</p>
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
                  deadline={deadlines[s.id] ?? null}
                  onDeadlineChange={(deadline) => setDeadlines((current) => {
                    const next = { ...current };
                    if (deadline) next[s.id] = deadline;
                    else delete next[s.id];
                    return next;
                  })}
                  relationSearchValues={[query, uni, birthPlace, residencePlace, loc]}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {resultPage > 0 && (
                <Button variant="outline" className="rounded-xl" onClick={() => setResultPage((page) => Math.max(0, page - 1))}>
                  {t("sch.previousBatch")}
                </Button>
              )}
              {hasNextBatch && (
                <Button variant="outline" className={cn("rounded-xl", resultPage === 0 && "col-span-2")} onClick={goToNextBatch} disabled={loadingMore || (datasetFilterActive && datasetScanning)}>
                  {loadingMore || (datasetFilterActive && datasetScanning) ? t("sch.loading") : t("sch.nextBatch")}
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
  deadline,
  onDeadlineChange,
  relationSearchValues,
}: {
  scholarship: Scholarship;
  profile: ReturnType<typeof loadProfile>;
  saved: boolean;
  applied: boolean;
  deadline: PersonalDeadline | null;
  onDeadlineChange: (deadline: PersonalDeadline | null) => void;
  relationSearchValues: string[];
}) {
  const t = useT();
  const navigate = useNavigate();
  const translateTag = useTagTranslator();
  const eligibilityResult = profile ? checkEligibility(profile, s) : null;
  const state = eligibilityResult ? eligibilityState(eligibilityResult) : null;
  const category = primaryScholarshipCategory(s) ?? t("sch.studentRelevant");
  const location = scholarshipLocationLabel(s);
  const relationHighlights = relationSearchValues.flatMap((value) => scholarshipSearchRelationReasons(s, value));
  const highlights = [...relationHighlights, ...eligibilityHighlights(s)].slice(0, 3);
  const directApplication = hasDirectApplicationTarget(s);
  const isTravel = scholarshipMatchesTravel(s);
  const isStudyAbroad = scholarshipMatchesStudyAbroad(s);
  const hasGeoConnection = highlights.some((point) => normalizeText(point).includes("ort") || normalizeText(point).includes("region") || normalizeText(point).includes("local"));
  const openDetail = () => navigate(`/stipendier/${s.id}`);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        "group cursor-pointer rounded-[28px] border p-5 shadow-soft transition-all active:scale-[0.99] hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        saved ? "border-emerald-200/80 bg-emerald-50/80" : "border-border/70 bg-card",
        applied && "border-success/50 bg-success-soft/75"
      )}
    >
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
          {state && <EligibilityStateBadge state={state} />}
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

      {saved && (
        <PersonalDeadlineQuickEdit
          scholarshipId={s.id}
          value={deadline}
          onChange={onDeadlineChange}
        />
      )}

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
    </article>
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
