import { NavLink } from "react-router-dom";
import { Home, User, Search, ShieldCheck, Bookmark, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function BottomTabs() {
  const t = useT();
  const TABS = [
    { to: "/", label: t("nav.home"), icon: Home, end: true },
    { to: "/stipendier", label: t("nav.scholarships"), icon: Search },
    { to: "/matchningar", label: t("nav.matches"), icon: ShieldCheck },
    { to: "/sparade", label: t("nav.saved"), icon: Bookmark },
    { to: "/utkast", label: t("nav.drafts"), icon: FileText },
    { to: "/profil", label: t("nav.profile"), icon: User },
  ];
  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 bg-app/95 backdrop-blur-xl border-t border-border/70 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-colors min-w-0",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-7 w-10 max-w-full items-center justify-center rounded-full transition-all", isActive && "bg-primary-soft")}>
                    <Icon className="h-[17px] w-[17px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="max-w-full truncate text-[8.8px] font-medium leading-none sm:text-[10px]">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
