import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/site/logo";

/** Browser/app chrome used to frame every product preview on the site. */
export function AppFrame({
  title,
  subtitle,
  children,
  className,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-app",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="text-[0.8125rem] font-semibold">{title}</span>
        </div>
        {subtitle ? (
          <>
            <span className="text-border-strong">/</span>
            <span className="truncate text-[0.8125rem] text-muted-foreground">{subtitle}</span>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">{toolbar}</div>
      </div>
      {children}
    </div>
  );
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </p>
  );
}
