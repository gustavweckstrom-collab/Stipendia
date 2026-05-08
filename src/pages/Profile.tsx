import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppScreen from "@/components/layout/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, CheckCircle2, Shield, Upload, FileText, X, Pencil, FilePlus2, User, FolderOpen, Settings } from "lucide-react";
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
  SYFTE_OPTIONS,
  EKONOMI_OPTIONS,
  DOC_TYPES,
  DocumentUpload,
  isProfileComplete,
} from "@/types/profile";
import { loadProfile, saveProfile } from "@/lib/storage";
import { validateName } from "@/lib/validation";
import { useOptionLabel, useT } from "@/lib/i18n";
import { toast } from "sonner";

const STEP_COUNT = 4;

export default function Profile() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editing = params.get("edit") === "1" || params.get("edit") === "docs";
  const initialStep = params.get("edit") === "docs" ? 3 : 0;

  const [profile, setProfile] = useState<StudentProfile | null>(loadProfile());
  const showForm = !profile || editing;

  if (!showForm && profile) {
    return <ProfileSummary profile={profile} onEdit={() => setParams({ edit: "1" })} onEditDocs={() => setParams({ edit: "docs" })} />;
  }

  return (
    <ProfileWizard
      initial={profile ?? EMPTY_PROFILE}
      initialStep={initialStep}
      onCancel={() => {
        setParams({});
        if (profile && isProfileComplete(profile)) navigate("/profil");
      }}
      onSaved={() => {
        setParams({});
        navigate("/matchningar");
      }}
    />
  );
}

/* ----------------- Summary ----------------- */

function ProfileSummary({ profile, onEdit, onEditDocs }: { profile: StudentProfile; onEdit: () => void; onEditDocs: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const optionLabel = useOptionLabel();
  const purposeLabel = SYFTE_OPTIONS.find((o) => o.value === profile.syfte)?.value ?? profile.syfte;
  const rows: { label: string; value: string }[] = [
    { label: t("profile.firstName"), value: profile.firstName },
    { label: t("profile.lastName"), value: profile.lastName },
    { label: t("profile.gender"), value: optionLabel(profile.kon) },
    { label: t("profile.homeTown"), value: profile.hemort },
    { label: t("profile.university"), value: profile.universitet },
    { label: t("profile.studyCity"), value: profile.studieort },
    { label: t("profile.field"), value: optionLabel(profile.amnesomrade) },
    { label: t("profile.educationLevel"), value: optionLabel(profile.utbildningsniva) },
    { label: t("profile.purpose"), value: optionLabel(purposeLabel ?? "") },
    { label: t("profile.economy"), value: optionLabel(profile.ekonomi) },
  ];
  const uploads = profile.uploads ?? [];

  return (
    <AppScreen
      title={t("profile.summary")}
      subtitle={t("profile.aiSummary")}
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
            <p>{t("profile.aiInfo")}</p>
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

        <section className="bg-card rounded-3xl border border-border/60 shadow-soft p-4">
          <h2 className="font-semibold text-sm flex items-center gap-1.5 px-1.5 pt-0.5 pb-2">
            <FolderOpen className="h-4 w-4 text-primary" /> {t("profile.docs")}
          </h2>
          {uploads.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">{t("profile.noDocs")}</p>
          ) : (
            <ul className="space-y-1">
              {uploads.map((u) => {
                const label = optionLabel(DOC_TYPES.find((d) => d.k === u.documentType)?.label ?? u.documentType);
                return (
                  <li key={u.documentType} className="flex items-start gap-2 p-2.5 rounded-xl bg-secondary/40">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(u.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full">{t("profile.docStatus")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onEdit} className="rounded-xl gap-1"><Pencil className="h-4 w-4" /> {t("profile.editProfile")}</Button>
          <Button onClick={onEditDocs} variant="outline" className="rounded-xl gap-1"><FilePlus2 className="h-4 w-4" /> {t("profile.updateDocs")}</Button>
        </div>
      </div>
    </AppScreen>
  );
}

/* ----------------- Wizard ----------------- */

function ProfileWizard({ initial, initialStep, onCancel, onSaved }: { initial: StudentProfile; initialStep: number; onCancel: () => void; onSaved: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const optionLabel = useOptionLabel();
  const [step, setStep] = useState(initialStep);
  const [profile, setProfile] = useState<StudentProfile>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      if (!profile.amnesomrade.trim()) e.amnesomrade = t("v.fieldReq");
      if (!profile.utbildningsniva.trim()) e.utbildningsniva = t("v.educationReq");
      if (!profile.studieort.trim()) e.studieort = t("v.studyReq");
    }
    if (step === 2) {
      if (!profile.syfte.trim()) e.syfte = t("v.purposeReq");
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
  const stepLabels = [t("profile.step.about"), t("profile.step.studies"), t("profile.step.context"), t("profile.step.docs")];

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
            <p>{t("profile.aiInfo")}</p>
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
                <Input value={profile.program} onChange={(e) => update("program", e.target.value)} placeholder={t("profile.programPh")} />
              </Field>
              <Field label={`${t("profile.field")} *`} error={errors.amnesomrade}>
                <Select value={profile.amnesomrade} onValueChange={(v) => update("amnesomrade", v)}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectPh")} /></SelectTrigger>
                  <SelectContent>
                    {AMNESOMRADE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{optionLabel(o)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t("profile.educationLevel")} *`} error={errors.utbildningsniva}>
                  <Select value={profile.utbildningsniva} onValueChange={(v) => update("utbildningsniva", v)}>
                    <SelectTrigger><SelectValue placeholder={t("profile.selectPh")} /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVEL_OPTIONS.map((level) => <SelectItem key={level} value={level}>{optionLabel(level)}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <Textarea rows={3} value={profile.engagemang} onChange={(e) => update("engagemang", e.target.value)} placeholder={t("profile.engagementPh")} />
              </Field>
              <Field label={t("profile.interests")}>
                <Textarea rows={2} value={profile.intressen} onChange={(e) => update("intressen", e.target.value)} placeholder={t("profile.interestsPh")} />
              </Field>
              <Field label={`${t("profile.purpose")} *`} error={errors.syfte} hint={t("profile.purposeHint")}>
                <Select value={profile.syfte} onValueChange={(v) => update("syfte", v)}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectOptionPh")} /></SelectTrigger>
                  <SelectContent>
                    {SYFTE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{optionLabel(o.value)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("profile.economy")}>
                <Select value={profile.ekonomi} onValueChange={(v) => update("ekonomi", v)}>
                  <SelectTrigger><SelectValue placeholder={t("profile.selectOptionPh")} /></SelectTrigger>
                  <SelectContent>
                    {EKONOMI_OPTIONS.map((o) => <SelectItem key={o} value={o}>{optionLabel(o)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`${t("profile.aboutYou")} (${t("common.optional")})`} hint={t("profile.aboutYouHint")}>
                <Textarea rows={3} value={profile.omDig ?? ""} onChange={(e) => update("omDig", e.target.value)} placeholder="" />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><FolderOpen className="h-4 w-4 text-primary" /> {t("profile.uploadHeader")}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("profile.uploadHelp")}</p>
              </div>
              <div className="space-y-2">
                {DOC_TYPES.map(({ k, label }) => (
                  <DocUploadRow
                    key={k}
                    label={optionLabel(label)}
                    docType={k}
                    uploads={profile.uploads ?? []}
                    onAdd={(u) => update("uploads", [...(profile.uploads ?? []).filter((x) => x.documentType !== u.documentType), u])}
                    onRemove={(type) => update("uploads", (profile.uploads ?? []).filter((x) => x.documentType !== type))}
                  />
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-2xl bg-primary-soft border border-primary/15 p-3 text-xs">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground/80">{t("profile.uploadHelp")}</p>
              </div>
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

function DocUploadRow({ label, docType, uploads, onAdd, onRemove }: {
  label: string; docType: string; uploads: DocumentUpload[];
  onAdd: (u: DocumentUpload) => void; onRemove: (type: string) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = uploads.find((u) => u.documentType === docType);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
      toast.error(t("profile.fileUnsupported"));
      return;
    }
    onAdd({ documentType: docType, fileName: file.name, uploadDate: new Date().toISOString() });
    toast.success(t("profile.docAdded", { name: label }));
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        {!existing ? (
          <Button type="button" size="sm" variant="outline" className="rounded-xl h-8" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> {t("profile.upload")}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="rounded-xl h-8 text-destructive hover:text-destructive" onClick={() => onRemove(docType)}>
            <X className="h-3.5 w-3.5 mr-1" /> {t("profile.remove")}
          </Button>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "";
        }} />
      </div>
      {existing && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground truncate">
            {existing.fileName} - {new Date(existing.uploadDate).toLocaleDateString()}
          </p>
          <span className="text-[10px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full shrink-0">{t("profile.added")}</span>
        </div>
      )}
    </div>
  );
}
