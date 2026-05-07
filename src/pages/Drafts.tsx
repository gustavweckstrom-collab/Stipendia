import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadDrafts, deleteDraft } from "@/lib/storage";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, FolderOpen } from "lucide-react";
import { SavedApplication } from "@/types/profile";
import { useT } from "@/lib/i18n";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

export default function Drafts() {
  const t = useT();
  const [drafts, setDrafts] = useState<SavedApplication[]>([]);

  useEffect(() => {
    const refresh = () => setDrafts(loadDrafts());
    refresh();
    window.addEventListener("stipendia:update", refresh);
    return () => window.removeEventListener("stipendia:update", refresh);
  }, []);

  const sorted = [...drafts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <AppScreen title={t("draft.pageTitle")} subtitle={t("draft.pageSubtitle")}>
      <div className="bg-card rounded-3xl border border-border/60 shadow-soft p-3">
        {sorted.length === 0 ? (
          <div className="px-1 py-2 text-center">
            <StipendiaIllustration variant="drafts" className="mb-4" />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-2">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">{t("draft.emptyTitle")}</h2>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm text-muted-foreground leading-relaxed">{t("draft.pageEmpty")}</p>
            <Button asChild variant="outline" className="mt-4 rounded-xl h-11">
              <Link to="/stipendier">{t("sch.title")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {sorted.map((d) => (
              <li key={d.scholarshipId} className="px-1 py-3">
                <div className="flex items-start gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{d.scholarshipName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("draft.created")}: {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button asChild size="sm" variant="outline" className="rounded-lg h-8 text-xs flex-1">
                        <Link to={`/utkast/${d.scholarshipId}`}>{t("common.open")}</Link>
                      </Button>
                      <button
                        onClick={() => deleteDraft(d.scholarshipId)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppScreen>
  );
}
