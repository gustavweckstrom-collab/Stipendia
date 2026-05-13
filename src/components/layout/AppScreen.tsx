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
        <div className="sticky top-0 z-20 border-b border-border/60 bg-app/95 backdrop-blur-md">
          <div className="flex min-h-[5rem] items-center gap-2 px-4 pt-4 pb-3">
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
              {title && <h1 className="py-0.5 text-[28px] font-extrabold leading-[1.12] tracking-normal text-foreground line-clamp-2">{title}</h1>}
              {subtitle && <p className="mt-0.5 text-[13px] font-medium text-muted-foreground leading-snug line-clamp-2">{subtitle}</p>}
            </div>
            {right}
          </div>
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
