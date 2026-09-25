import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Warm"
  | "Interested"
  | "Qualified"
  | "Won"
  | "Lost";

const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      status: {
        New: "border-border bg-surface-muted text-muted-foreground",
        Contacted: "border-border-strong bg-secondary text-secondary-foreground",
        Warm: "border-warning/25 bg-warning-soft text-warning-foreground",
        Interested: "border-primary/20 bg-primary-soft text-accent-foreground",
        Qualified: "border-primary/30 bg-primary-soft text-accent-foreground",
        Won: "border-success/25 bg-success-soft text-success",
        Lost: "border-border bg-surface-muted text-muted-foreground line-through",
      },
    },
    defaultVariants: { status: "New" },
  },
);

const dotColor: Record<LeadStatus, string> = {
  New: "bg-muted-foreground/50",
  Contacted: "bg-muted-foreground",
  Warm: "bg-warning",
  Interested: "bg-primary/70",
  Qualified: "bg-primary",
  Won: "bg-success",
  Lost: "bg-muted-foreground/40",
};

export function StatusBadge({
  status,
  pulse = false,
  className,
}: VariantProps<typeof statusBadge> & {
  status: LeadStatus;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(statusBadge({ status }), className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          dotColor[status],
          pulse && "motion-safe:animate-pulse",
        )}
      />
      {status}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
        <span
          className={cn(
            "block h-full rounded-full",
            score >= 75 ? "bg-success" : score >= 50 ? "bg-primary" : "bg-muted-foreground/50",
          )}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{score}</span>
    </span>
  );
}
