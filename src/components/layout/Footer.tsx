import { Shield } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Footer() {
  const t = useT();
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="container py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="font-semibold text-foreground">Stipendia</div>
          <p className="mt-2 text-muted-foreground">{t("settings.appDesc")}</p>
        </div>
        <div className="flex items-start gap-3 md:col-span-2 rounded-xl bg-background border border-border p-4">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{t("settings.data")}: </span>
            {t("settings.privacy")}
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Stipendia · {t("settings.prototype")}
      </div>
    </footer>
  );
}
