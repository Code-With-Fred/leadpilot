import { createFileRoute } from "@tanstack/react-router";

import { FeaturesSection } from "@/components/sections/features";
import { FaqSection, FinalCta, HowItWorksSection } from "@/components/sections/more-sections";
import { meta, PageIntro, PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/product")({
  head: () => meta("Product — LeadPilot", "See how LeadPilot finds, researches, contacts and follows up with leads in one workspace."),
  component: () => (
    <PageShell>
      <PageIntro eyebrow="Product" title="Your sales team's quiet co-pilot" description="Find the right prospects, understand them in seconds, and keep every conversation moving without spreadsheets." />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqSection />
      <FinalCta />
    </PageShell>
  ),
});
