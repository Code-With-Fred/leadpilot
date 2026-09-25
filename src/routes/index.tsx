import { createFileRoute } from "@tanstack/react-router";

import { FeaturesSection } from "@/components/sections/features";
import { Hero } from "@/components/sections/hero";
import { FaqSection, FinalCta, HowItWorksSection, PricingSection } from "@/components/sections/more-sections";
import { ProblemSection } from "@/components/sections/problem-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { meta, PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/")({
  head: () => meta("LeadPilot — AI sales automation that books meetings", "LeadPilot researches prospects, writes personalized outreach, and runs follow ups so your team can focus on closing."),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </PageShell>
  );
}
