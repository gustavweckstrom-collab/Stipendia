import { BookOpen, FileText, Search, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "home" | "saved" | "drafts" | "profile" | "empty";

const variantIcon = {
  home: Sparkles,
  saved: Search,
  drafts: FileText,
  profile: ShieldCheck,
  empty: BookOpen,
} as const;

export function StipendiaIllustration({ variant = "home", className }: { variant?: Variant; className?: string }) {
  const Icon = variantIcon[variant];
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-soft", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,#fff_54%,hsl(var(--accent-soft))_100%)]" />
      <div className="relative h-full min-h-[132px] p-4">
        <div className="absolute right-4 top-4 h-10 w-10 rounded-2xl border border-primary/15 bg-white/80 text-primary shadow-soft flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="absolute left-4 top-5 h-20 w-16 rotate-[-7deg] rounded-2xl border border-border/80 bg-white shadow-soft">
          <div className="mx-3 mt-4 h-1.5 rounded-full bg-primary/70" />
          <div className="mx-3 mt-2 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-1.5 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-4 h-5 rounded-xl bg-primary-soft" />
        </div>
        <div className="absolute bottom-4 right-8 h-16 w-24 rotate-[4deg] rounded-2xl border border-border/80 bg-white shadow-soft">
          <div className="mx-3 mt-3 flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-primary-soft" />
            <span className="h-1.5 flex-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="mx-3 mt-3 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-1.5 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        <div className="absolute bottom-5 left-14 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
          <Search className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
