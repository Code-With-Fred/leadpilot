import { ArrowDown, ArrowRight, Clock3, MessagesSquare, Timer } from "lucide-react";

import { Reveal } from "@/components/site/motion-primitives";
import { Section, SectionHeading } from "@/components/site/section";
import { cn } from "@/lib/utils";

const problems = [
  {
    icon: Clock3,
    title: "Leads go cold",
    body: "A prospect shows interest, but nobody follows up at the right time.",
  },
  {
    icon: MessagesSquare,
    title: "Every message sounds the same",
    body: "Generic outreach gets ignored.",
  },
  {
    icon: Timer,
    title: "Sales teams waste time",
    body: "Hours disappear into researching prospects, writing messages, updating CRM records, and chasing replies.",
  },
];

const brokenFlow = [
  "Lead arrives",
  "Manual research",
  "Write message",
  "Send",
  "Wait",
  "Forget",
  "Lost opportunity",
];

const pilotFlow = ["Research", "Personalize", "Reach out", "Follow up", "Qualify", "Book"];

function FlowColumn({
  title,
  steps,
  tone,
}: {
  title: string;
  steps: string[];
  tone: "broken" | "pilot";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        tone === "broken"
          ? "border-border bg-surface-muted"
          : "border-primary/25 bg-surface shadow-raised",
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          tone === "pilot" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {title}
      </p>
      <ol className="mt-4 space-y-1.5">
        {steps.map((step, i) => (
          <li key={step}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                tone === "broken"
                  ? "border-dashed border-border-strong bg-background text-muted-foreground"
                  : "border-border bg-background font-medium",
                tone === "broken" && i === steps.length - 1 && "border-destructive/30 text-destructive",
                tone === "pilot" && i === steps.length - 1 && "border-success/35 text-success",
              )}
            >
              {tone === "pilot" ? (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.625rem] font-semibold text-accent-foreground">
                  {i + 1}
                </span>
              ) : null}
              {step}
            </div>
            {i < steps.length - 1 ? (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="size-3 text-border-strong" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProblemSection() {
  return (
    <Section id="problem">
      <div className="container-page">
        <SectionHeading
          eyebrow="The real bottleneck"
          title={
            <>
              Most businesses don&apos;t have a lead problem.
              <br className="hidden sm:block" /> They have a follow up problem.
            </>
          }
          description="Leads get lost between spreadsheets, inboxes, WhatsApp conversations, CRM systems, and busy schedules."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07}>
              <div className="h-full rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-raised">
                <span className="grid size-9 place-items-center rounded-md bg-surface-muted text-muted-foreground">
                  <p.icon className="size-4.5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <FlowColumn title="Today" steps={brokenFlow} tone="broken" />
            <div className="flex justify-center">
              <span className="grid size-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-card">
                <ArrowRight className="size-4 lg:rotate-0 rotate-90" />
              </span>
            </div>
            <FlowColumn title="With LeadPilot" steps={pilotFlow} tone="pilot" />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
