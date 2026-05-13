import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PersonalDeadline, removePersonalDeadline, savePersonalDeadline } from "@/lib/storage";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DeadlineStatus = "none" | "added" | "approaching" | "today" | "passed";

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatDeadline(date: string, lang: "sv" | "en") {
  return new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function splitDate(date: string) {
  const [year = "", month = "", day = ""] = date.split("-");
  return { year, month, day };
}

function toDateValue(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function daysInMonth(year: string, month: string) {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || 1;
  return new Date(y, m, 0).getDate();
}

function yearOptions() {
  const start = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, index) => start + index);
}

function deadlineStatus(deadline: PersonalDeadline | null): { status: DeadlineStatus; days: number | null } {
  if (!deadline) return { status: "none", days: null };
  const days = daysUntil(deadline.date);
  if (days < 0) return { status: "passed", days };
  if (days === 0) return { status: "today", days };
  if (deadline.reminderDays && days <= deadline.reminderDays) return { status: "approaching", days };
  return { status: "added", days };
}

function statusLabel(status: DeadlineStatus, days: number | null, t: ReturnType<typeof useT>) {
  if (status === "none") return t("deadline.none");
  if (status === "passed") return t("deadline.passed");
  if (status === "today") return t("deadline.today");
  if (status === "approaching") return t("deadline.approachingIn", { n: Math.max(days ?? 0, 0) });
  return t("deadline.added");
}

function CalendarIllustration({ muted = false }: { muted?: boolean }) {
  return (
    <div className={cn(
      "relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border shadow-soft",
      muted ? "border-border/60 bg-secondary/70 text-muted-foreground" : "border-primary/15 bg-primary-soft text-primary"
    )}>
      <div className="absolute inset-x-0 top-0 h-7 bg-current/12" />
      <div className="absolute left-5 top-3 h-3 w-1.5 rounded-full bg-current/35" />
      <div className="absolute right-5 top-3 h-3 w-1.5 rounded-full bg-current/35" />
      <CalendarDays className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-[38%] opacity-85" strokeWidth={1.6} />
      <div className="absolute bottom-4 left-5 right-5 grid grid-cols-3 gap-1 opacity-45">
        <span className="h-1.5 rounded-full bg-current" />
        <span className="h-1.5 rounded-full bg-current" />
        <span className="h-1.5 rounded-full bg-current" />
      </div>
    </div>
  );
}

export function PersonalDeadlineSummary({
  deadline,
  showEmpty = false,
  className,
}: {
  deadline: PersonalDeadline | null | undefined;
  showEmpty?: boolean;
  className?: string;
}) {
  const t = useT();
  const lang = useLang();
  const value = deadline ?? null;
  const { status, days } = deadlineStatus(value);
  if (!value && !showEmpty) return null;

  return (
    <div className={cn(
      "rounded-2xl border px-3 py-2 text-[12px]",
      status === "approaching" || status === "today"
        ? "border-primary/20 bg-primary-soft text-primary"
        : status === "passed"
          ? "border-border/70 bg-secondary/70 text-muted-foreground"
          : "border-emerald-200/80 bg-emerald-50/80 text-success",
      !value && "border-border/70 bg-secondary/50 text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5 font-semibold">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <span>{value ? `${t("deadline.personal")}: ${formatDeadline(value.date, lang)}` : t("deadline.add")}</span>
      </div>
      <p className="mt-0.5 text-[11px] opacity-80">{statusLabel(status, days, t)}</p>
    </div>
  );
}

export function PersonalDeadlineEditor({
  scholarshipId,
  value,
  onChange,
}: {
  scholarshipId: string;
  value: PersonalDeadline | null;
  onChange: (deadline: PersonalDeadline | null) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [editing, setEditing] = useState(!value);
  const initial = splitDate(value?.date ?? "");
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [reminder, setReminder] = useState<string>(value?.reminderDays ? String(value.reminderDays) : "none");
  const { status, days } = useMemo(() => deadlineStatus(value), [value]);
  const date = toDateValue(year, month, day);

  useEffect(() => {
    const next = splitDate(value?.date ?? "");
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
    setReminder(value?.reminderDays ? String(value.reminderDays) : "none");
    setEditing(!value);
  }, [value]);

  useEffect(() => {
    if (!day) return;
    const max = daysInMonth(year, month);
    if (Number(day) > max) setDay(String(max).padStart(2, "0"));
  }, [day, month, year]);

  const save = () => {
    if (!date) return;
    const reminderDays = reminder === "1" || reminder === "3" || reminder === "7" ? Number(reminder) as 1 | 3 | 7 : null;
    const next = { date, reminderDays };
    savePersonalDeadline(scholarshipId, next);
    onChange(next);
    setEditing(false);
    toast.success(t("deadline.saved"));
  };

  const remove = () => {
    removePersonalDeadline(scholarshipId);
    onChange(null);
    setEditing(false);
    toast.success(t("deadline.removed"));
  };

  if (!editing && value) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 rounded-2xl border border-border/60 bg-secondary/35 p-3">
          <CalendarIllustration />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("deadline.personal")}</p>
            <p className="mt-1 text-base font-bold leading-tight">{formatDeadline(value.date, lang)}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{statusLabel(status, days, t)}</p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
          <Bell className="h-3.5 w-3.5" />
          {value.reminderDays ? (value.reminderDays === 1 ? t("deadline.reminder1") : t("deadline.reminderBefore", { n: value.reminderDays })) : t("deadline.noReminder")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="rounded-xl gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {t("deadline.edit")}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl gap-1.5 text-muted-foreground" onClick={remove}>
            <Trash2 className="h-4 w-4" /> {t("deadline.remove")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-2xl border border-border/60 bg-secondary/35 p-3">
        <CalendarIllustration muted />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("deadline.add")}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("deadline.helper")}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-[12px] font-semibold text-muted-foreground">{t("deadline.chooseDate")}</label>
        <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2">
          <DateSelect value={day} onChange={setDay} label={t("deadline.day")}>
            {Array.from({ length: daysInMonth(year, month) }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => (
              <option key={value} value={value}>{Number(value)}</option>
            ))}
          </DateSelect>
          <DateSelect value={month} onChange={setMonth} label={t("deadline.month")}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => (
              <option key={value} value={value}>{new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", { month: "short" }).format(new Date(2026, Number(value) - 1, 1))}</option>
            ))}
          </DateSelect>
          <DateSelect value={year} onChange={setYear} label={t("deadline.year")}>
            {yearOptions().map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </DateSelect>
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-[12px] font-semibold text-muted-foreground">{t("deadline.remindMe")}</label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={reminder}
            onChange={(event) => setReminder(event.target.value)}
            className="h-11 w-full rounded-xl border border-transparent bg-secondary pl-9 pr-3 text-sm font-medium outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
          >
            <option value="none">{t("deadline.noReminder")}</option>
            <option value="7">{t("deadline.reminder7")}</option>
            <option value="3">{t("deadline.reminder3")}</option>
            <option value="1">{t("deadline.reminder1")}</option>
          </select>
        </div>
      </div>
      {date && (
        <p className="text-[12px] text-muted-foreground">
          {t("deadline.preview", { date: formatDeadline(date, lang) })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="rounded-xl" onClick={save} disabled={!date}>{t("common.save")}</Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => {
          if (value) setEditing(false);
          else {
            setDay("");
            setMonth("");
            setYear("");
          }
        }}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}

export function PersonalDeadlineQuickEdit({
  scholarshipId,
  value,
  onChange,
  className,
}: {
  scholarshipId: string;
  value: PersonalDeadline | null;
  onChange: (deadline: PersonalDeadline | null) => void;
  className?: string;
}) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const initial = splitDate(value?.date ?? "");
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [reminder, setReminder] = useState<string>(value?.reminderDays ? String(value.reminderDays) : "none");
  const date = toDateValue(year, month, day);
  const { status, days } = deadlineStatus(value);

  useEffect(() => {
    if (!open) {
      const next = splitDate(value?.date ?? "");
      setDay(next.day);
      setMonth(next.month);
      setYear(next.year);
      setReminder(value?.reminderDays ? String(value.reminderDays) : "none");
    }
  }, [open, value]);

  useEffect(() => {
    if (!day) return;
    const max = daysInMonth(year, month);
    if (Number(day) > max) setDay(String(max).padStart(2, "0"));
  }, [day, month, year]);

  const save = () => {
    if (!date) return;
    const reminderDays = reminder === "1" || reminder === "3" || reminder === "7" ? Number(reminder) as 1 | 3 | 7 : null;
    const next = { date, reminderDays };
    savePersonalDeadline(scholarshipId, next);
    onChange(next);
    setOpen(false);
    toast.success(t("deadline.saved"));
  };

  const remove = () => {
    removePersonalDeadline(scholarshipId);
    onChange(null);
    setOpen(false);
    toast.success(t("deadline.removed"));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-white/80 p-3 text-left shadow-soft transition-all active:scale-[0.99] hover:border-primary/30 hover:bg-white",
          className
        )}
      >
        <span className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
          value ? "border-success/25 bg-success-soft text-success" : "border-primary/15 bg-primary-soft text-primary"
        )}>
          <CalendarDays className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-foreground">
            {value ? formatDeadline(value.date, lang) : t("deadline.add")}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {value ? statusLabel(status, days, t) : t("deadline.tapToAdd")}
          </span>
        </span>
        <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      className={cn("mt-3 rounded-2xl border border-primary/20 bg-white/90 p-3 shadow-soft", className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary-soft text-primary">
          <CalendarDays className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight">{value ? t("deadline.edit") : t("deadline.add")}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t("deadline.cardHelper")}</p>
        </div>
      </div>
      <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2">
        <DateSelect value={day} onChange={setDay} label={t("deadline.day")}>
          {Array.from({ length: daysInMonth(year, month) }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => (
            <option key={item} value={item}>{Number(item)}</option>
          ))}
        </DateSelect>
        <DateSelect value={month} onChange={setMonth} label={t("deadline.month")}>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => (
            <option key={item} value={item}>{new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", { month: "short" }).format(new Date(2026, Number(item) - 1, 1))}</option>
          ))}
        </DateSelect>
        <DateSelect value={year} onChange={setYear} label={t("deadline.year")}>
          {yearOptions().map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </DateSelect>
      </div>
      <div className="relative mt-2">
        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={reminder}
          onChange={(event) => setReminder(event.target.value)}
          className="h-11 w-full rounded-xl border border-transparent bg-secondary pl-9 pr-3 text-sm font-medium outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
        >
          <option value="none">{t("deadline.noReminder")}</option>
          <option value="7">{t("deadline.reminder7")}</option>
          <option value="3">{t("deadline.reminder3")}</option>
          <option value="1">{t("deadline.reminder1")}</option>
        </select>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" className="rounded-xl" onClick={save} disabled={!date}>{t("common.save")}</Button>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
      </div>
      {value && (
        <button
          type="button"
          onClick={remove}
          className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold text-muted-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("deadline.remove")}
        </button>
      )}
    </div>
  );
}

function DateSelect({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-transparent bg-secondary px-3 text-sm font-medium outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}
