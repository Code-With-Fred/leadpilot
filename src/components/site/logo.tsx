import { cn } from "@/lib/utils";

/** Abstract navigation mark: a forward-tilted pilot arrow inside a rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect width="28" height="28" rx="7" className="fill-primary" />
      <path
        d="M8 18.4 19.2 8.8c.5-.43 1.22.1.99.72l-4.03 10.7c-.23.6-1.06.64-1.34.06l-1.5-3.06a.75.75 0 0 0-.4-.36l-3.2-1.2c-.6-.23-.66-1.03-.1-1.35"
        className="fill-primary-foreground"
      />
      <path d="M12.9 16.8 11.6 21l3.1-2.2z" className="fill-primary-foreground opacity-60" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">LeadPilot</span>
    </span>
  );
}
