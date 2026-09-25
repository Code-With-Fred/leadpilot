import { createFileRoute } from "@tanstack/react-router";

import { FaqSection, FinalCta, PricingSection } from "@/components/sections/more-sections";
import { meta, PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/pricing")({
  head: () => meta("Pricing — LeadPilot", "Start free, then pick the LeadPilot plan that fits your team. Month to month, cancel anytime."),
  component: () => (
    <PageShell>
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </PageShell>
  ),
});
