import { Link, NavLink, useLocation } from "react-router-dom";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = [
    { to: "/", label: t("nav.home") },
    { to: "/profil", label: t("nav.profile") },
    { to: "/stipendier", label: t("nav.scholarships") },
    { to: "/matchningar", label: t("nav.matches") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-gradient text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="tracking-tight">Stipendia</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-secondary"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("nav.menu")}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container py-2 flex flex-col">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-3 rounded-lg text-sm font-medium",
                  loc.pathname === item.to
                    ? "bg-primary-soft text-primary"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
