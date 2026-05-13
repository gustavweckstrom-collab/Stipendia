import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadProfile, loadSavedIds } from "@/lib/storage";
import { profileCompleteness, StudentProfile } from "@/types/profile";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Search, GraduationCap, Wallet, Plane, BookOpen, ChevronRight, HelpCircle, UserPlus, Bookmark, ShieldCheck, MapPin, Landmark, Globe2,
} from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setProfile(loadProfile());
      setSavedCount(loadSavedIds().length);
    };
    refresh();
    window.addEventListener("stipendia:update", refresh);
    return () => window.removeEventListener("stipendia:update", refresh);
  }, []);

  const completeness = profileCompleteness(profile);
  const hasProfile = Boolean(profile);

  return (
    <div className="px-4 pt-6 pb-2 space-y-6">
      <section className="rounded-[30px] border border-border/70 bg-card p-4 shadow-lift">
        <div className="grid min-w-0 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("home.kicker")}</p>
            <h1 className="mt-2 max-w-full break-words text-[28px] font-extrabold leading-[1.06]">{t("home.title")}</h1>
            <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed">{t("home.intro")}</p>
          </div>
          <ExploreRail />
          <div className={hasProfile ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
            <Button onClick={() => navigate("/stipendier")} className="rounded-xl h-11">
              {t("home.findCta")}
            </Button>
            {hasProfile && (
              <Button onClick={() => navigate("/matchningar")} variant="outline" className="rounded-xl h-11">
                {t("home.viewMatches")}
              </Button>
            )}
          </div>
        </div>
      </section>

      {!profile && (
        <div className="rounded-3xl border border-primary/15 bg-primary-soft/60 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">{t("nav.profile")}</p>
              <p className="font-bold text-lg leading-tight mt-0.5">
                {completeness === 0 ? t("home.startProfile") : t("home.profileProgress", { p: completeness })}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">{t("profile.profileSummary")}</p>
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
        </div>
      )}

      <Section title={t("home.howItWorks")}>
        <ol className="rounded-3xl border border-border/60 bg-card px-4 py-1 shadow-none">
          <Step n={1} icon={UserPlus} title={t("home.step1.title")} desc={t("home.step1.desc")} />
          <Step n={2} icon={Search} title={t("home.step2.title")} desc={t("home.step2.desc")} />
          <Step n={3} icon={ShieldCheck} title={t("home.step3.title")} desc={t("home.step3.desc")} />
        </ol>
      </Section>

      <div className="grid grid-cols-1 gap-2">
        <Link to="/stipendier?sparade=1" className="p-4 bg-card rounded-2xl border border-border/60 shadow-soft transition-transform active:scale-[0.99]">
          <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-foreground flex items-center justify-center"><Bookmark className="h-5 w-5" /></span>
          <p className="font-semibold text-sm mt-2">{t("home.savedTitle")}</p>
          <p className="text-[11px] text-muted-foreground">{t("home.savedSub", { n: savedCount })}</p>
        </Link>
      </div>

      <Section title={t("home.why")}>
        <div className="rounded-3xl border border-border/50 bg-secondary/30 px-4 py-4 shadow-none">
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
    <li className="flex items-start gap-3 border-b border-border/50 py-3.5 last:border-b-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-secondary/70 text-xs font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="font-semibold text-sm leading-tight">{title}</p>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </li>
  );
}
function Why({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-primary/60">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function ExploreRail() {
  const t = useT();
  return (
    <section className="min-w-0 space-y-2.5">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-[17px] font-bold leading-tight">{t("home.exploreTitle")}</h2>
        <span className="text-[11px] font-semibold text-muted-foreground">{t("home.exploreHint")}</span>
      </div>
      <div className="no-scrollbar -mx-1 flex max-w-full snap-x gap-3 overflow-x-auto px-1 pb-1.5">
        <ExploreCard
          to="/stipendier?q=student"
          icon={GraduationCap}
          title={t("home.explore.broad")}
          desc={t("home.explore.broadDesc")}
          tone="green"
        />
        <ExploreCard
          to="/stipendier?resa=1"
          icon={Plane}
          title={t("home.explore.travel")}
          desc={t("home.explore.travelDesc")}
          tone="blue"
        />
        <ExploreCard
          to="/stipendier?q=utlandsstudier"
          icon={Globe2}
          title={t("home.explore.abroad")}
          desc={t("home.explore.abroadDesc")}
          tone="violet"
        />
        <ExploreCard
          to="/stipendier?q=anknytning"
          icon={MapPin}
          title={t("home.explore.geo")}
          desc={t("home.explore.geoDesc")}
          tone="sand"
        />
        <ExploreCard
          to="/stipendier?q=stiftelse"
          icon={Landmark}
          title={t("home.explore.foundations")}
          desc={t("home.explore.foundationsDesc")}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function ExploreCard({ to, icon: Icon, title, desc, tone }: { to: string; icon: any; title: string; desc: string; tone: "green" | "blue" | "violet" | "sand" | "neutral" }) {
  const toneClass = {
    green: "from-[#F5F0DF] via-[#EAF5EE] to-[#CFE7D6] text-[#2F7650]",
    blue: "from-[#EDF6F4] via-[#E7F0FF] to-[#C9DDF7] text-[#42699B]",
    violet: "from-[#EEF4F1] via-[#ECEBFA] to-[#D5E0F7] text-[#5F65A8]",
    sand: "from-[#F7F1E4] via-[#ECF4EF] to-[#DED4BE] text-[#77623F]",
    neutral: "from-[#F7F3EA] via-white to-[#E6E0D2] text-[#58615A]",
  }[tone];
  return (
    <Link to={to} className="group relative min-w-[13.75rem] snap-start overflow-hidden rounded-[26px] border border-white/70 bg-card p-4 shadow-soft transition-all active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-card">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
      <Icon className="absolute -right-5 top-2 h-24 w-24 rotate-[-8deg] text-current opacity-[0.13]" strokeWidth={1.7} />
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/35 blur-[1px]" />
      <div className="absolute bottom-3 right-3 h-14 w-20 rotate-[-4deg] rounded-2xl border border-white/75 bg-white/55 shadow-soft backdrop-blur-sm">
        <div className="mx-3 mt-3 h-1.5 rounded-full bg-current/30" />
        <div className="mx-3 mt-2 h-1 rounded-full bg-current/15" />
        <div className="mx-3 mt-1.5 h-1 rounded-full bg-current/15" />
      </div>
      <div className="relative min-h-[8.75rem]">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-soft">
          <Icon className="h-5 w-5" />
        </span>
        <div className="absolute inset-x-0 bottom-0 pr-5">
          <h3 className="text-[15px] font-bold leading-tight text-foreground">{title}</h3>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{desc}</p>
        </div>
        <span className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-current shadow-soft transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
