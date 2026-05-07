import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function AppScreen({ title, subtitle, back, right, children, className }: Props) {
  const navigate = useNavigate();
  return (
    <div className={cn("min-h-full", className)}>
      {(title || back || right) && (
        <div className="sticky top-0 z-20 bg-app/95 backdrop-blur-md border-b border-border/60">
          <div className="flex items-center gap-2 px-4 min-h-16 py-2">
            {back && (
              <button
                onClick={() => navigate(-1)}
                className="-ml-2 h-9 w-9 flex items-center justify-center rounded-full hover:bg-secondary text-foreground"
                aria-label="Tillbaka"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-[22px] font-bold leading-tight tracking-tight line-clamp-2">{title}</h1>}
              {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug line-clamp-2">{subtitle}</p>}
            </div>
            {right}
          </div>
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
