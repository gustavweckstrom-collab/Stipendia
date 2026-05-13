import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const statusBadgeClass = "inline-flex min-h-5 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none";

export function EligibilityBadge({ eligible, className }: { eligible: boolean; className?: string }) {
  const t = useT();
  return (
    <span className={cn(
      statusBadgeClass,
      eligible ? "bg-success-soft text-success border-success/30" : "bg-muted text-muted-foreground border-border",
      className
    )}>
      {eligible ? t("sch.eligible") : t("sch.notEligible")}
    </span>
  );
}

export function EligibilityStateBadge({ state, className }: { state: "eligible" | "review" | "not-eligible"; className?: string }) {
  const t = useT();
  const map = {
    eligible: { label: t("sch.eligible"), cls: "bg-success-soft text-success border-success/30" },
    review: { label: t("match.statusReview"), cls: "bg-secondary text-muted-foreground border-border" },
    "not-eligible": { label: t("match.statusReview"), cls: "bg-secondary text-muted-foreground border-border" },
  } as const;
  const { label, cls } = map[state];
  return <span className={cn(statusBadgeClass, cls, className)}>{label}</span>;
}

export function ApplicationStateBadge({ applied, className }: { applied: boolean; className?: string }) {
  const t = useT();
  return (
    <span className={cn(
      statusBadgeClass,
      applied ? "bg-success-soft text-success border-success/30" : "bg-secondary text-muted-foreground border-border",
      className
    )}>
      {applied ? t("match.statusApplied") : t("match.statusNotApplied")}
    </span>
  );
}
