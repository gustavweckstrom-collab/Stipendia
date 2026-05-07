import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Scholarship } from "@/data/scholarships";
import { loadScholarshipsByIds } from "@/lib/scholarshipData";
import { isApplied, loadSavedIds, toggleSaved } from "@/lib/storage";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Building2, ChevronRight, Tag } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ApplicationStateBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

export default function Saved() {
  const t = useT();
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => setIds(loadSavedIds());
    refresh();
    window.addEventListener("stipendia:update", refresh);
    return () => window.removeEventListener("stipendia:update", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadScholarshipsByIds(ids).then((items) => {
      if (!cancelled) setItems(items);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ids]);

  return (
    <AppScreen title={t("saved.title")} subtitle={t("saved.subtitle")}>
      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t("sch.loading")}</div>
      ) : items.length === 0 ? (
        <div className="rounded-[30px] border border-border/70 bg-card p-4 text-center shadow-soft">
          <StipendiaIllustration variant="saved" className="mb-4" />
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
            <Bookmark className="h-7 w-7" />
          </div>
          <h2 className="text-base font-semibold">{t("saved.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("saved.empty")}</p>
          <Button asChild className="mt-4 rounded-xl h-11">
            <Link to="/stipendier">{t("saved.cta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((s) => {
            const category = (s.tags ?? [])[0] ?? t("sch.studentRelevant");
            const applied = isApplied(s.id);
            return (
              <div key={s.id} className="block p-4 bg-card rounded-2xl border border-border/70 shadow-soft transition-transform active:scale-[0.99]">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[15px] leading-snug">{s.name}</h3>
                  <button
                    onClick={() => { toggleSaved(s.id); toast.success(t("saved.removedToast")); }}
                    className="text-primary hover:text-destructive"
                    aria-label={t("common.delete")}
                  >
                    <BookmarkCheck className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" /> {s.organization}
                </p>
                <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-foreground"><Tag className="h-3.5 w-3.5 text-primary" />{category}</span>
                  <span className="text-muted-foreground">{t("sch.externalSource")}</span>
                  {applied && <ApplicationStateBadge applied />}
                </div>
                <Button asChild size="sm" variant="outline" className="mt-3 w-full rounded-xl gap-1">
                  <Link to={`/stipendier/${s.id}`}>{t("sch.details")} <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppScreen>
  );
}
