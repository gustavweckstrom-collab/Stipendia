import { ReactNode } from "react";
import { Signal, Wifi, BatteryFull } from "lucide-react";
import BottomTabs from "./BottomTabs";

/**
 * App-shell that frames everything as a phone on desktop.
 * On small screens it goes edge-to-edge.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-app md:bg-transparent md:p-6">
      {/* Phone frame */}
      <div className="relative w-full md:w-[430px] md:h-[900px] md:max-h-[calc(100dvh-3rem)] md:rounded-[44px] bg-app md:shadow-phone md:border md:border-border md:overflow-hidden h-[100dvh] overflow-hidden flex flex-col">
        {/* Status bar (desktop only) */}
        <div className="hidden md:flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-semibold text-foreground/80 shrink-0">
          <span>9:41</span>
          <div className="flex items-center gap-2 text-foreground/70">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-[env(safe-area-inset-top)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] overscroll-contain">
          {children}
        </div>

        <BottomTabs />
      </div>
    </div>
  );
}
