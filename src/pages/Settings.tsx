import { useEffect, useState } from "react";
import AppScreen from "@/components/layout/AppScreen";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays, Languages, Database, Trash2, RotateCcw, Bookmark, Info, Shield } from "lucide-react";
import { getLang, setLang, useT, Lang } from "@/lib/i18n";
import { clearAll, clearProfile } from "@/lib/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NOTIF_KEY = "stipendia.notifs";

interface Notifs { applicationReminders: boolean; savedReminders: boolean; deadlineReminders: boolean; matchUpdates: boolean }
const defaultNotifs: Notifs = { applicationReminders: true, savedReminders: true, deadlineReminders: true, matchUpdates: false };

function loadNotifs(): Notifs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return defaultNotifs;
    const parsed = JSON.parse(raw);
    return {
      ...defaultNotifs,
      ...parsed,
      applicationReminders: parsed.applicationReminders ?? defaultNotifs.applicationReminders,
      deadlineReminders: parsed.deadlineReminders ?? defaultNotifs.deadlineReminders,
    };
  }
  catch { return defaultNotifs; }
}
function saveNotifs(n: Notifs) { localStorage.setItem(NOTIF_KEY, JSON.stringify(n)); }

export default function SettingsPage() {
  const t = useT();
  const [notifs, setNotifs] = useState<Notifs>(defaultNotifs);
  const [lang, setLangLocal] = useState<Lang>(getLang());

  useEffect(() => setNotifs(loadNotifs()), []);

  const update = (k: keyof Notifs, v: boolean) => {
    const next = { ...notifs, [k]: v };
    setNotifs(next); saveNotifs(next);
  };

  const switchLang = (l: Lang) => { setLang(l); setLangLocal(l); };

  return (
    <AppScreen title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="space-y-4">
        <Section icon={Bell} title={t("settings.notifications")}>
          <Row icon={Bell} label={t("settings.applicationReminders")}>
            <Switch checked={notifs.applicationReminders} onCheckedChange={(v) => update("applicationReminders", v)} />
          </Row>
          <Row icon={Bookmark} label={t("settings.savedReminders")}>
            <Switch checked={notifs.savedReminders} onCheckedChange={(v) => update("savedReminders", v)} />
          </Row>
          <Row icon={CalendarDays} label={t("settings.deadlineReminders")}>
            <Switch checked={notifs.deadlineReminders} onCheckedChange={(v) => update("deadlineReminders", v)} />
          </Row>
          <Row icon={Info} label={t("settings.matchUpdates")} last>
            <Switch checked={notifs.matchUpdates} onCheckedChange={(v) => update("matchUpdates", v)} />
          </Row>
        </Section>

        <Section icon={Languages} title={t("settings.language")}>
          <div className="flex gap-2 p-2">
            {(["sv", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => switchLang(l)} className={cn(
                "flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors",
                lang === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>{l === "sv" ? t("settings.swedish") : t("settings.english")}</button>
            ))}
          </div>
        </Section>

        <Section icon={Database} title={t("settings.data")}>
          <div className="p-2 space-y-3">
            <div className="flex items-start gap-2 rounded-2xl bg-secondary/50 border border-border/60 p-3">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-foreground/80">{t("settings.privacy")}</p>
            </div>
            <DangerAction
              icon={RotateCcw}
              label={t("settings.resetProfile")}
              desc={t("settings.resetProfileDesc")}
              confirmTitle={t("settings.confirmReset")}
              confirmDesc={t("settings.confirmResetDesc")}
              onConfirm={() => { clearProfile(); toast.success(t("settings.done")); }}
            />
            <DangerAction
              icon={Trash2}
              label={t("settings.deleteAll")}
              desc={t("settings.deleteAllDesc")}
              confirmTitle={t("settings.confirmDelete")}
              confirmDesc={t("settings.confirmDeleteDesc")}
              destructive
              onConfirm={() => { clearAll(); toast.success(t("settings.done")); }}
            />
          </div>
        </Section>

        <Section icon={Info} title={t("settings.appInfo")}>
          <div className="px-2 py-2.5">
            <p className="text-sm font-semibold">Stipendia</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("settings.appDesc")}</p>
            <p className="mt-3 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{t("settings.prototype")}</p>
          </div>
        </Section>
      </div>
    </AppScreen>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-3xl border border-border/60 shadow-soft p-3">
      <h2 className="font-semibold text-sm flex items-center gap-1.5 px-1.5 pt-0.5 pb-2">
        <Icon className="h-4 w-4 text-primary" />{title}
      </h2>
      {children}
    </section>
  );
}

function Row({ icon: Icon, label, children, last }: { icon: any; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-2 py-3", !last && "border-b border-border/50")}>
      <span className="min-w-0 flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>{label}</span>
      </span>
      {children}
    </div>
  );
}

function DangerAction({ icon: Icon, label, desc, confirmTitle, confirmDesc, onConfirm, destructive }: {
  icon: any; label: string; desc: string; confirmTitle: string; confirmDesc: string; onConfirm: () => void; destructive?: boolean;
}) {
  const t = useT();
  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start rounded-xl gap-2", destructive && "text-destructive hover:text-destructive")}>
            <Icon className="h-4 w-4" /> {label}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-[11px] text-muted-foreground mt-1 px-1 leading-snug">{desc}</p>
    </div>
  );
}
