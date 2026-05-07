import { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Scholarship, ScholarshipIndex } from "@/data/scholarships";
import { loadFirstScholarshipChunk, loadScholarshipChunk } from "@/lib/scholarshipData";
import AppScreen from "@/components/layout/AppScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, ChevronRight, SlidersHorizontal, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { AMNESOMRADE_OPTIONS, SCHOLARSHIP_TYPES, ScholarshipType, UNIVERSITET_OPTIONS, STUDIEORT_OPTIONS } from "@/types/profile";
import { checkEligibility, scholarshipTypes } from "@/lib/eligibility";
import { loadProfile } from "@/lib/storage";
import { EligibilityBadge } from "@/components/StatusBadge";

const RESULT_STEP = 50;

export default function Scholarships() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string>("");
  const [uni, setUni] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [types, setTypes] = useState<ScholarshipType[]>([]);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile());
  const [index, setIndex] = useState<ScholarshipIndex | null>(null);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [nextChunk, setNextChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RESULT_STEP);

  useEffect(() => {
    const r = () => setProfile(loadProfile());
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setVisibleCount(RESULT_STEP), [query, field, uni, loc, types, eligibleOnly]);

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

  const norm = (s: string) => s.trim().toLowerCase();
  const partial = (a: string, b: string) => norm(a).includes(norm(b)) || norm(b).includes(norm(a));

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (query) {
        const q = query.toLowerCase();
        const hit = [
          s.name, s.organization, s.description, s.location ?? "", ...(s.tags ?? []), ...(s.targetGroup ?? []), ...(s.fieldOfStudy ?? []),
        ].some((value) => value.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (field) {
        const fields = [...(s.eligibleFields ?? []), ...(s.fieldOfStudy ?? [])];
        if (!(fields.some((f) => partial(f, field)) || partial(field, (s.tags ?? []).join(" ")))) return false;
      }
      if (uni && !((s.eligibleUniversities ?? []).length === 0 || (s.eligibleUniversities ?? []).some((u) => partial(u, uni)))) return false;
      if (loc && !partial(s.location ?? s.source?.city ?? "", loc)) return false;
      if (types.length > 0) {
        const sTypes = scholarshipTypes(s);
        if (!types.some((tp) => sTypes.includes(tp))) return false;
      }
      if (eligibleOnly && profile) {
        if (!checkEligibility(profile, s).eligible) return false;
      }
      return true;
    });
  }, [items, query, field, uni, loc, types, eligibleOnly, profile]);

  const activeFilterCount =
    (field ? 1 : 0) + (uni ? 1 : 0) + (loc ? 1 : 0) + (types.length > 0 ? 1 : 0) + (eligibleOnly ? 1 : 0);

  const resetFilters = () => { setField(""); setUni(""); setLoc(""); setTypes([]); setEligibleOnly(false); };

  const total = index?.total ?? items.length;
  const hasFilter = activeFilterCount > 0 || query.length > 0;
  const subtitle = hasFilter
    ? t("sch.loadedFiltered", { n: filtered.length, l: items.length, t: total })
    : t("sch.loadedCount", { n: items.length, t: total });
  const visibleItems = filtered.slice(0, visibleCount);
  const hasMoreLoadedResults = visibleCount < filtered.length;
  const hasMoreChunks = Boolean(index && nextChunk < index.chunks.length);

  return (
    <AppScreen title={t("sch.title")} subtitle={subtitle}>
      <div className="space-y-3">
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
                  <ChipRow options={[{ id: "", label: "—" }, ...AMNESOMRADE_OPTIONS.map((o) => ({ id: o, label: o }))]} value={field} onChange={setField} />
                </FilterGroup>
                <FilterGroup label={t("sch.f.university")}>
                  <SearchableCombobox value={uni} onChange={setUni} options={UNIVERSITET_OPTIONS as unknown as string[]} placeholder={t("sch.f.university")} />
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
                        )}>{tp}</button>
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

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {field && <ActiveChip label={field} onRemove={() => setField("")} />}
            {uni && <ActiveChip label={uni} onRemove={() => setUni("")} />}
            {loc && <ActiveChip label={loc} onRemove={() => setLoc("")} />}
            {types.map((tp) => <ActiveChip key={tp} label={tp} onRemove={() => setTypes((c) => c.filter((x) => x !== tp))} />)}
            {eligibleOnly && <ActiveChip label={t("sch.eligible")} onRemove={() => setEligibleOnly(false)} />}
            <button onClick={resetFilters} className="text-[11px] font-semibold text-primary px-2 py-1">{t("sch.f.clear")}</button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t("sch.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("sch.noMatch")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {hasMoreChunks && <Button variant="outline" className="rounded-xl" onClick={loadMore} disabled={loadingMore}>{loadingMore ? t("sch.loading") : t("sch.searchMore")}</Button>}
              <button onClick={resetFilters} className="text-sm font-semibold text-primary">{t("sch.f.clear")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">{visibleItems.map((s) => <BrowseCard key={s.id} scholarship={s} profile={profile} />)}</div>
            <div className="space-y-2">
              {hasMoreLoadedResults && <Button variant="outline" className="w-full rounded-xl" onClick={() => setVisibleCount((count) => count + RESULT_STEP)}>{t("sch.loadMore")}</Button>}
              {!hasMoreLoadedResults && hasMoreChunks && (
                <Button variant="outline" className="w-full rounded-xl" onClick={loadMore} disabled={loadingMore}>
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

function BrowseCard({ scholarship: s, profile }: { scholarship: Scholarship; profile: ReturnType<typeof loadProfile> }) {
  const t = useT();
  const eligible = profile ? checkEligibility(profile, s).eligible : null;
  const category = (s.tags ?? [])[0] ?? t("sch.studentRelevant");
  return (
    <div className="block p-4 bg-card rounded-2xl border border-border/70 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[15px] leading-snug">{s.name}</h3>
        {eligible !== null && <EligibilityBadge eligible={eligible} />}
      </div>
      <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
        <Building2 className="h-3 w-3" /> {s.location || s.organization}
      </p>
      <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <Tag className="h-3.5 w-3.5 text-primary" />{category}
        </span>
        <span className="text-muted-foreground">{t("sch.externalSource")}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {(s.tags ?? []).slice(0, 3).map((tg) => (
          <span key={tg} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tg}</span>
        ))}
      </div>
      <Button asChild size="sm" variant="outline" className="mt-3 w-full rounded-xl gap-1">
        <Link to={`/stipendier/${s.id}`}>{t("sch.details")} <ChevronRight className="h-4 w-4" /></Link>
      </Button>
    </div>
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
