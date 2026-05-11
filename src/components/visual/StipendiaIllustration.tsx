import { BookOpen, Search, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "home" | "saved" | "profile" | "empty";

const variantIcon = {
  home: Sparkles,
  saved: Search,
  profile: ShieldCheck,
  empty: BookOpen,
} as const;

export function StipendiaIllustration({ variant = "home", className }: { variant?: Variant; className?: string }) {
  const Icon = variantIcon[variant];
  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-soft", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#F7F3EA_0%,#FFFFFF_43%,#ECF4EF_100%)]" />
      <div className="absolute left-0 top-0 h-12 w-28 rounded-br-[28px] bg-[#E8F0FF]" />
      <div className="absolute bottom-0 right-0 h-16 w-32 rounded-tl-[34px] bg-[#F5E7C8]" />
      <div className="relative h-full min-h-[146px] p-4">
        <div className="absolute right-4 top-4 h-10 w-10 rounded-2xl border border-primary/15 bg-white/90 text-primary shadow-soft flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="absolute left-4 top-5 h-[5.5rem] w-[4.35rem] rotate-[-7deg] rounded-2xl border border-border/80 bg-white shadow-soft">
          <div className="mx-3 mt-4 h-1.5 rounded-full bg-primary/70" />
          <div className="mx-3 mt-2 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-1.5 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-4 h-5 rounded-xl bg-[#DDE7FF]" />
        </div>
        <div className="absolute left-[4.75rem] top-9 h-14 w-20 rotate-[5deg] rounded-2xl border border-border/70 bg-[#FFF7E8] shadow-soft">
          <div className="mx-3 mt-3 h-1.5 rounded-full bg-[#D19A3C]/55" />
          <div className="mx-3 mt-2 h-1 rounded-full bg-[#D19A3C]/20" />
          <div className="mx-3 mt-1.5 h-1 rounded-full bg-[#D19A3C]/20" />
        </div>
        <div className="absolute bottom-4 right-8 h-[4.5rem] w-[6.5rem] rotate-[4deg] rounded-2xl border border-border/80 bg-white shadow-soft">
          <div className="mx-3 mt-3 flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-primary-soft" />
            <span className="h-1.5 flex-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="mx-3 mt-3 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-1.5 h-1 rounded-full bg-muted-foreground/20" />
          <div className="mx-3 mt-2 flex gap-1">
            <span className="h-4 flex-1 rounded-full bg-[#E8F0FF]" />
            <span className="h-4 w-8 rounded-full bg-primary-soft" />
          </div>
        </div>
        <div className="absolute bottom-5 left-14 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
          <Search className="h-5 w-5" />
        </div>
        <div className="absolute bottom-7 left-[6.5rem] flex items-center gap-1.5 rounded-full border border-border/70 bg-white/90 px-2.5 py-1 text-primary shadow-soft">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="h-1.5 w-12 rounded-full bg-primary/35" />
        </div>
      </div>
    </div>
  );
}
