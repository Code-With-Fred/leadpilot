import { createFileRoute } from "@tanstack/react-router";
import { Building2, Home, Megaphone, Sun } from "lucide-react";

import { FinalCta } from "@/components/sections/more-sections";
import { meta, PageIntro, PageShell } from "@/components/site/page-shell";

const items = [
  { id: "solar", icon: Sun, title: "Solar", body: "Find homeowners and businesses in your service area and follow up until they book a site survey." },
  { id: "real-estate", icon: Home, title: "Real Estate", body: "Reach property owners and investors with messages that reference their market." },
  { id: "agencies", icon: Megaphone, title: "Agencies", body: "Research brands before you pitch and keep your pipeline full every month." },
  { id: "home-services", icon: Building2, title: "Home Services", body: "Win commercial contracts and repeat customers without hours of cold calling." },
];

export const Route = createFileRoute("/solutions")({
  head: () => meta("Solutions — LeadPilot", "How solar, real estate, agency and home services teams use LeadPilot to book more meetings."),
  component: () => (
    <PageShell>
      <PageIntro eyebrow="Solutions" title="Built for teams that sell every day" description="LeadPilot adapts its research and messaging to your industry." />
      <section className="section-y">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {items.map((i) => (
            <div key={i.id} id={i.id} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-7">
              <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
                <i.icon className="size-5" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">{i.title}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </div>
      </section>
      <FinalCta />
    </PageShell>
  ),
});
