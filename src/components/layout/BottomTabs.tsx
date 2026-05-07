import { NavLink } from "react-router-dom";
import { Home, User, Search, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function BottomTabs() {
  const t = useT();
  const TABS = [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/stipendier", label: t("nav.scholarships"), icon: Search },
    { to: "/matchningar", label: t("nav.matches"), icon: ShieldCheck },
    { to: "/utkast", label: t("nav.drafts"), icon: FileText },
    { to: "/profil", label: t("nav.profile"), icon: User },
  ];
  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 bg-app/95 backdrop-blur-xl border-t border-border/70 pb-[max(env(safe-area-inset-bottom),0.625rem)]">
      <ul className="flex items-stretch justify-around gap-1 px-2 pt-2">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => cn(
              "flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-colors min-w-0",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-8 w-11 max-w-full items-center justify-center rounded-full transition-all", isActive && "bg-primary-soft shadow-soft")}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
