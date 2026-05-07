import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EligibilityBadge({ eligible, className }: { eligible: boolean; className?: string }) {
  const t = useT();
  return (
    <span className={cn(
      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
      eligible ? "bg-success-soft text-success border-success/30" : "bg-muted text-muted-foreground border-border",
      className
    )}>
      {eligible ? t("sch.eligible") : t("sch.notEligible")}
    </span>
  );
}
