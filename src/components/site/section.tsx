import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/motion-primitives";

export function Section({
  id,
  children,
  className,
  tone = "default",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "surface" | "ink";
}) {
  return (
    <section
      id={id}
      className={cn(
        "section-y scroll-mt-20",
        tone === "surface" && "border-y border-border bg-surface",
        tone === "ink" && "bg-ink text-ink-foreground",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="text-3xl font-semibold leading-[1.15] sm:text-[2.5rem]">{title}</h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </Reveal>
  );
}
