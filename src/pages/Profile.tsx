import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, CheckCircle2, Pencil, Settings, Shield, User } from "lucide-react";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import {
  EMPTY_PROFILE,
  StudentProfile,
  KON_OPTIONS,
  UNIVERSITET_OPTIONS,
  STUDIEORT_OPTIONS,
  HEMORT_SUGGESTIONS,
  AMNESOMRADE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  ENGAGEMENT_OPTIONS,
  SYFTE_OPTIONS,
  EKONOMI_OPTIONS,
  PROGRAM_SUGGESTIONS_BY_UNIVERSITY,
  COMMON_PROGRAM_SUGGESTIONS,
  isProfileComplete,
} from "@/types/profile";
import { loadProfile, saveProfile } from "@/lib/storage";
import { validateName } from "@/lib/validation";
import { useOptionLabel, useT } from "@/lib/i18n";
import { toast } from "sonner";

const STEP_COUNT = 3;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Profile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editing = params.get("edit") === "1" || params.get("edit") === "docs";
  const [profile] = useState<StudentProfile | null>(loadProfile());
  const showForm = !profile || editing;

  if (!showForm && profile) {
    return <ProfileSummary profile={profile} onEdit={() => setParams({ edit: "1" })} />;
  }

  return (
    <ProfileWizard
      initial={profile ?? EMPTY_PROFILE}
      onCancel={() => {
        setParams({});
        if (profile && isProfileComplete(profile)) navigate("/profil");
        else navigate("/");
      }}
      onSaved={() => {
        setParams({});
        navigate("/matchningar");
      }}
    />
  );
}

function ProfileSummary({ profile, onEdit }: { profile: StudentProfile; onEdit: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const optionLabel = useOptionLabel();
  const formatOptions = (values: string[]) => values.map(optionLabel).join(", ");
  const rows: { label: string; value: string }[] = [
    { label: t("profile.firstName"), value: profile.firstName },
    { label: t("profile.lastName"), value: profile.lastName },
    { label: t("profile.gender"), value: optionLabel(profile.kon) },
    { label: t("profile.homeTown"), value: profile.hemort },
    { label: t("profile.university"), value: profile.universitet },
    { label: t("profile.studyCity"), value: profile.studieort },
    { label: t("profile.field"), value: formatOptions(profile.amnesomrade) },
    { label: t("profile.educationLevel"), value: optionLabel(profile.utbildningsniva) },
    { label: t("profile.purpose"), value: formatOptions(profile.syfte) },
    { label: t("profile.economy"), value: optionLabel(profile.ekonomi) },
  ];

  return (
    <AppScreen
      title={t("profile.summary")}
      subtitle={t("profile.profileSummary")}
      right={
        <button onClick={() => navigate("/installningar")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary text-foreground" aria-label={t("settings.title")}>
          <Settings className="h-5 w-5" />
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-primary/15 bg-primary-soft/55 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white text-primary flex items-center justify-center shadow-soft"><User className="h-6 w-6" /></div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">{t("profile.summary")}</p>
              <p className="font-bold text-lg leading-tight">{profile.firstName} {profile.lastName}</p>
              <p className="mt-1 text-[12px] text-muted-foreground leading-snug">{t("profile.privacyNote")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-4 text-[12px] text-foreground/80 leading-relaxed shadow-soft">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>{t("profile.profileInfo")}</p>
          </div>
        </div>

        <section className="bg-card rounded-3xl border border-border/60 shadow-soft p-4">
          <ul className="divide-y divide-border/60">
            {rows.map((r) => (
              <li key={r.label} className="flex items-start justify-between gap-3 px-1 py-3">
                <span className="text-[12px] font-medium text-muted-foreground">{r.label}</span>
                <span className="text-sm text-right max-w-[60%]">{r.value || <em className="text-muted-foreground/70 not-italic">{t("profile.notSet")}</em>}</span>
              </li>
            ))}
          </ul>
        </section>

        <Button onClick={onEdit} className="w-full rounded-xl gap-1">
          <Pencil className="h-4 w-4" /> {t("profile.editProfile")}
        </Button>
      </div>
    </AppScreen>
  );
}

function ProfileWizard({ initial, onCancel, onSaved }: { initial: StudentProfile; onCancel: () => void; onSaved: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const optionLabel = useOptionLabel();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const programOptions = useMemo(() => {
    const selectedUniversity = Object.keys(PROGRAM_SUGGESTIONS_BY_UNIVERSITY)
      .find((university) => normalize(university) === normalize(profile.universitet));
    return Array.from(new Set([
      ...(selectedUniversity ? PROGRAM_SUGGESTIONS_BY_UNIVERSITY[selectedUniversity] : []),
      ...COMMON_PROGRAM_SUGGESTIONS,
    ]));
  }, [profile.universitet]);

  const update = <K extends keyof StudentProfile>(k: K, v: StudentProfile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const nameErrToText = (kind: "first" | "last", err: ReturnType<typeof validateName>): string | undefined => {
    if (!err) return undefined;
    if (err === "required") return t(kind === "first" ? "v.firstReq" : "v.lastReq");
    if (err === "digits") return t(kind === "first" ? "v.firstDigits" : "v.lastDigits");
    return t("v.nameInvalid");
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      const f = nameErrToText("first", validateName(profile.firstName));
      if (f) e.firstName = f;
      const l = nameErrToText("last", validateName(profile.lastName));
      if (l) e.lastName = l;
      if (!profile.kon) e.kon = t("v.genderReq");
      if (!profile.hemort.trim()) e.hemort = t("v.homeReq");
    }
    if (step === 1) {
      if (!profile.universitet.trim()) e.universitet = t("v.uniReq");
      if (!profile.program.trim()) e.program = t("v.programReq");
      if (profile.amnesomrade.length === 0) e.amnesomrade = t("v.fieldReq");
      if (!profile.utbildningsniva.trim()) e.utbildningsniva = t("v.educationReq");
      if (!profile.studieort.trim()) e.studieort = t("v.studyReq");
    }
    if (step === 2) {
      if (profile.syfte.length === 0) e.syfte = t("v.purposeReq");
      if (!profile.ekonomi.trim()) e.ekonomi = t("v.economyReq");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) {
      toast.error(t("profile.fixFields"));
      return;
    }
    if (step === STEP_COUNT - 1) {
      saveProfile(profile);
      toast.success(t("profile.savedToast"));
      onSaved();
    } else {
      setStep((s) => s + 1);
    }
  };

  const progress = ((step + 1) / STEP_COUNT) * 100;
  const stepLabels = [t("profile.step.about"), t("profile.step.studies"), t("profile.step.context")];

  return (
    <AppScreen
      title={t("profile.create")}
      subtitle={`${step + 1} / ${STEP_COUNT} - ${stepLabels[step]}`}
      back={step > 0}
      right={
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/installningar")} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary text-foreground" aria-label={t("settings.title")}>
            <Settings className="h-5 w-5" />
          </button>
          <button onClick={onCancel} className="text-xs font-semibold text-muted-foreground px-2 py-1">
            {t("common.cancel")}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <Progress value={progress} className="h-1.5" />
        <div className="rounded-2xl bg-card border border-border/60 p-4 text-[12px] text-foreground/80 leading-relaxed shadow-soft">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>{t("profile.profileInfo")}</p>
          </div>
        </div>

        <div className="space-y-5">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`${t("profile.firstName")} *`} error={errors.firstName}>
                  <Input value={profile.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Anna" maxLength={50} />
                </Field>
                <Field label={`${t("profile.lastName")} *`} error={errors.lastName}>
                  <Input value={profile.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Andersson" maxLength={50} />
                </Field>
              </div>

              <Field label={`${t("profile.gender")} *`} error={errors.kon}>
                <RadioGroup value={profile.kon} onValueChange={(v) => update("kon", v)} className="grid grid-cols-2 gap-2">
                  {KON_OPTIONS.map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                      profile.kon === opt ? "border-primary bg-primary-soft" : "border-border bg-secondary/40 hover:bg-secondary"
                    }`}>
                      <RadioGroupItem value={opt} />
                      <span className="text-sm font-medium">{optionLabel(opt)}</span>
                    </label>
                  ))}
                </RadioGroup>
              </Field>

              <Field label={`${t("profile.homeTown")} *`} error={errors.hemort} hint={t("profile.homeTownHint")}>
                <SearchableCombobox
                  value={profile.hemort}
                  onChange={(v) => update("hemort", v)}
                  options={HEMORT_SUGGESTIONS}
                  placeholder={t("profile.homeTownPh")}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label={`${t("profile.university")} *`} error={errors.universitet}>
                <SearchableCombobox value={profile.universitet} onChange={(v) => update("universitet", v)} options={UNIVERSITET_OPTIONS} placeholder={t("profile.uniPh")} />
              </Field>
              <Field label={`${t("profile.program")} *`} error={errors.program}>
                <SearchableCombobox value={profile.program} onChange={(v) => update("program", v)} options={programOptions} placeholder={t("profile.programPh")} maxResults={8} />
                <p className="mt-1 text-[11px] text-muted-foreground">{t("profile.programHint")}</p>
              </Field>
              <Field label={`${t("profile.field")} *`} error={errors.amnesomrade} hint={t("profile.fieldHint")}>
                <MultiSelectChips
                  options={AMNESOMRADE_OPTIONS as unknown as string[]}
                  value={profile.amnesomrade}
                  onChange={(value) => update("amnesomrade", value)}
                  optionLabel={optionLabel}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={`${t("profile.educationLevel")} *`} error={errors.utbildningsniva}>
                    <Select value={profile.utbildningsniva} onValueChange={(v) => update("utbildningsniva", v)}>
                      <SelectTrigger><SelectValue placeholder={t("profile.selectPh")} /></SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVEL_OPTIONS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {optionLabel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 rounded-2xl border border-border/60 bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground">{optionLabel("Grundnivå")}:</span>{" "}
                        {t("profile.educationLevel.basicDesc")}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-foreground">{optionLabel("Avancerad nivå")}:</span>{" "}
                        {t("profile.educationLevel.advancedDesc")}
                      </p>
                    </div>
                  </Field>
                <Field label={`${t("profile.studyCity")} *`} error={errors.studieort}>
                  <SearchableCombobox value={profile.studieort} onChange={(v) => update("studieort", v)} options={STUDIEORT_OPTIONS} placeholder={t("profile.studyCityPh")} />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label={t("profile.engagement")}>
                <Select value={profile.engagemang} onValueChange={(v) => update("engagemang", v)}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectOptionPh")} /></SelectTrigger>
                  <SelectContent>
                    {ENGAGEMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{optionLabel(o)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`${t("profile.purpose")} *`} error={errors.syfte} hint={t("profile.purposeHint")}>
                <MultiSelectChips
                  options={SYFTE_OPTIONS.map((o) => o.value)}
                  value={profile.syfte}
                  onChange={(value) => update("syfte", value)}
                  optionLabel={optionLabel}
                />
              </Field>
              <Field label={`${t("profile.economy")} *`} error={errors.ekonomi}>
                <Select value={profile.ekonomi} onValueChange={(v) => update("ekonomi", v)}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectOptionPh")} /></SelectTrigger>
                  <SelectContent>
                    {EKONOMI_OPTIONS.map((o) => <SelectItem key={o} value={o}>{optionLabel(o)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border/60 bg-app/95 pt-3 pb-1 backdrop-blur-md">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="rounded-xl flex-1">{t("common.back")}</Button>
          )}
          <Button onClick={next} className="rounded-xl flex-1 shadow-glow">
            {step === STEP_COUNT - 1 ? (
              <><CheckCircle2 className="mr-1 h-4 w-4" /> {t("profile.saveAndMatch")}</>
            ) : (
              <>{t("common.next")} <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function MultiSelectChips({
  options,
  value,
  onChange,
  optionLabel,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  optionLabel: (value: string) => string;
}) {
  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {optionLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
