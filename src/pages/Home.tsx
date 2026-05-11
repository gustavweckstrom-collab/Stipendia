import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadDrafts, loadProfile, loadSavedIds } from "@/lib/storage";
import { isProfileComplete, profileCompleteness, StudentProfile, SavedApplication } from "@/types/profile";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sparkles, FileText, GraduationCap, Wallet, Plane, BookOpen, ChevronRight, HelpCircle, UserPlus, Send, Bookmark, ShieldCheck,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { StipendiaIllustration } from "@/components/visual/StipendiaIllustration";

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [drafts, setDrafts] = useState<SavedApplication[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setProfile(loadProfile());
      setDrafts(loadDrafts());
      setSavedCount(loadSavedIds().length);
    };
    refresh();
    window.addEventListener("stipendia:update", refresh);
    return () => window.removeEventListener("stipendia:update", refresh);
  }, []);

  const completeness = profileCompleteness(profile);
  const complete = isProfileComplete(profile);

  return (
    <div className="px-4 pt-6 pb-2 space-y-6">
      <section className="rounded-[30px] border border-border/70 bg-card p-4 shadow-lift">
        <div className="grid gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("home.kicker")}</p>
            <h1 className="mt-2 text-[30px] font-extrabold leading-[1.04]">{t("home.title")}</h1>
            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed">{t("home.intro")}</p>
          </div>
          <StipendiaIllustration variant="home" />
          <div className={complete ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
            <Button onClick={() => navigate("/stipendier")} className="rounded-xl h-11">
              {t("home.findCta")}
            </Button>
            {complete && (
              <Button onClick={() => navigate("/matchningar")} variant="outline" className="rounded-xl h-11">
                {t("home.viewMatches")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-3xl border border-primary/15 bg-primary-soft/60 p-4 shadow-soft">
        {complete ? (
          <>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">{t("nav.profile")}</p>
                <p className="font-bold text-lg leading-tight mt-0.5">{t("home.profileReady")}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{t("home.profileReadyDesc")}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white text-primary flex items-center justify-center shadow-soft shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={() => navigate("/matchningar")} className="w-full rounded-xl font-semibold h-10">
                {t("home.viewMatches")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">{t("nav.profile")}</p>
                <p className="font-bold text-lg leading-tight mt-0.5">
                  {completeness === 0 ? t("home.startProfile") : t("home.profileProgress", { p: completeness })}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">{t("profile.aiSummary")}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white text-primary flex items-center justify-center shadow-soft shrink-0">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={Math.max(completeness, 4)} className="h-1.5 bg-white/70" />
            </div>
            <div className="mt-3">
              <Button onClick={() => navigate("/profil?edit=1")} className="w-full rounded-xl font-semibold h-10">
                {completeness === 0 ? t("home.startProfile") : t("home.continueProfile")}
              </Button>
            </div>
          </>
        )}
      </div>

      <Section title={t("home.howItWorks")}>
        <ol className="space-y-3">
          <Step n={1} icon={UserPlus} title={t("home.step1.title")} desc={t("home.step1.desc")} />
          <Step n={2} icon={Sparkles} title={t("home.step2.title")} desc={t("home.step2.desc")} />
          <Step n={3} icon={Send} title={t("home.step3.title")} desc={t("home.step3.desc")} />
        </ol>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/stipendier?sparade=1" className="p-4 bg-card rounded-2xl border border-border/60 shadow-soft transition-transform active:scale-[0.99]">
          <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-foreground flex items-center justify-center"><Bookmark className="h-5 w-5" /></span>
          <p className="font-semibold text-sm mt-2">{t("home.savedTitle")}</p>
          <p className="text-[11px] text-muted-foreground">{t("home.savedSub", { n: savedCount })}</p>
        </Link>
        <Link to="/utkast" className="p-4 bg-card rounded-2xl border border-border/60 shadow-soft transition-transform active:scale-[0.99]">
          <span className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><FileText className="h-5 w-5" /></span>
          <p className="font-semibold text-sm mt-2">{t("home.draftsTitle")}</p>
          <p className="text-[11px] text-muted-foreground">{t("home.draftsSub", { n: drafts.length })}</p>
        </Link>
      </div>

      <Section title={t("home.why")}>
        <div className="grid grid-cols-1 gap-2">
          <Why icon={Wallet} title={t("home.why1.t")} desc={t("home.why1.d")} />
          <Why icon={Plane} title={t("home.why2.t")} desc={t("home.why2.d")} />
          <Why icon={BookOpen} title={t("home.why3.t")} desc={t("home.why3.d")} />
        </div>
      </Section>

      <Link to="/faq" className="flex items-center gap-3 p-4 bg-card rounded-3xl border border-border/60 shadow-soft hover:shadow-card transition-all active:scale-[0.99]">
        <span className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <HelpCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{t("home.faq")}</p>
          <p className="text-[12px] text-muted-foreground">{t("home.faqDesc")}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <p className="text-[10px] text-center text-muted-foreground/80 px-4 py-2">{t("home.localOnly")}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-[17px] mb-2 px-0.5">{title}</h2>
      {children}
    </section>
  );
}
function Step({ n, icon: Icon, title, desc }: { n: number; icon: any; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/50 bg-secondary/25 px-3.5 py-3.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-xs font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary/75" />
          <p className="font-semibold text-sm leading-tight">{title}</p>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </li>
  );
}
function Why({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-card rounded-2xl border border-border/60 shadow-soft">
      <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-foreground flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-[12px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}
