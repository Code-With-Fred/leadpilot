import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Reveal } from "@/components/site/motion-primitives";
import { Section, SectionHeading } from "@/components/site/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  { n: "01", title: "Tell LeadPilot who you sell to", body: "Pick an industry, a location, or upload your own list." },
  { n: "02", title: "Review the research", body: "Every lead comes with a short brief and a fit score." },
  { n: "03", title: "Approve the outreach", body: "Edit or approve personalized messages in one click." },
  { n: "04", title: "Take the meetings", body: "Follow ups send on their own and stop the moment a prospect replies." },
];

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" tone="surface">
      <div className="container-page">
        <SectionHeading eyebrow="How it works" title="Up and running in an afternoon" />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.06} className="rounded-xl border border-border bg-background p-6">
              <span className="text-sm font-semibold text-primary">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}

const plans = [
  { name: "Starter", price: "$0", note: "forever", desc: "For trying LeadPilot out.", features: ["50 researched leads / month", "Personalized drafts", "1 sending inbox"], cta: "Start free" },
  { name: "Growth", price: "$79", note: "per month", desc: "For solo sellers and small teams.", features: ["1,000 researched leads / month", "Automatic follow ups", "3 sending inboxes", "Calendar booking"], cta: "Start 14-day trial", featured: true },
  { name: "Scale", price: "$249", note: "per month", desc: "For teams running outbound daily.", features: ["5,000 researched leads / month", "Team seats & roles", "10 sending inboxes", "Priority support"], cta: "Start 14-day trial" },
];

export function PricingSection() {
  return (
    <Section id="pricing">
      <div className="container-page">
        <SectionHeading align="center" eyebrow="Pricing" title="Simple plans that grow with you" description="Start free. Upgrade when LeadPilot is booking meetings for you." />
        <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-2xl border bg-surface p-7",
                p.featured ? "border-primary shadow-raised" : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.featured ? (
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">Most popular</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-6">
                <span className="text-4xl font-semibold">{p.price}</span>{" "}
                <span className="text-sm text-muted-foreground">{p.note}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.featured ? "cta" : "quiet"} size="xl" className="mt-8">
                <Link to="/signup">{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

const faqs = [
  { q: "Do I need technical skills to use LeadPilot?", a: "No. If you can write an email, you can run LeadPilot. Setup takes a few minutes." },
  { q: "Will messages sound like a robot wrote them?", a: "Each message is based on real research about the prospect, and you can review everything before it sends." },
  { q: "Which email accounts can I connect?", a: "Google Workspace and Microsoft 365 inboxes, plus most standard email providers." },
  { q: "Can I import my existing leads?", a: "Yes. Upload a CSV or paste a list of company websites." },
  { q: "Can I cancel anytime?", a: "Yes. Plans are month to month and you can downgrade to Starter whenever you like." },
];

export function FaqSection() {
  return (
    <Section id="faq" tone="surface">
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section tone="ink">
      <div className="container-page text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">
          Spend your time on conversations, not busywork.
        </h2>
        <p className="mx-auto mt-4 max-w-xl opacity-75">
          Let LeadPilot handle the research and follow up. You take the meetings.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="cta" size="xl">
            <Link to="/signup">Start free</Link>
          </Button>
          <Button asChild variant="secondary" size="xl">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
