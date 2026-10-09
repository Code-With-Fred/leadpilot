import { useState } from "react";

import { AppFrame } from "@/components/product/app-frame";
import {
  ConvertPanel,
  FindPanel,
  FollowUpPanel,
  ReachPanel,
  ResearchPanel,
} from "@/components/product/showcase-panels";
import { Section, SectionHeading } from "@/components/site/section";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "find", label: "Find", title: "Find leads", desc: "Search by industry and location, import a CSV, or paste a list of websites.", Panel: FindPanel },
  { id: "research", label: "Research", title: "Research every prospect", desc: "LeadPilot reads each company's site and pulls out what matters before you reach out.", Panel: ResearchPanel },
  { id: "reach", label: "Reach", title: "Personalized outreach", desc: "Drafts written for each prospect, ready for you to approve or send automatically.", Panel: ReachPanel },
  { id: "follow", label: "Follow up", title: "Follow ups that never slip", desc: "Sequences send from your own inbox, pause the moment someone replies, and resume in one click if they go quiet.", Panel: FollowUpPanel },
  { id: "convert", label: "Convert", title: "Book the meeting", desc: "Qualified leads get a booking link and land on your calendar.", Panel: ConvertPanel },
];

export function FeaturesSection() {
  const [active, setActive] = useState("find");
  const tab = tabs.find((t) => t.id === active)!;
  return (
    <Section id="features">
      <div className="container-page">
        <SectionHeading
          eyebrow="The workspace"
          title="One place for the whole sales motion"
          description="From the first search to a booked call, every step lives in the same workspace."
        />
        <div role="tablist" aria-label="Features" className="mt-10 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-8 [&>*]:min-w-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:items-start">
          <div>
            <h3 className="text-2xl font-semibold">{tab.title}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{tab.desc}</p>
          </div>
          <AppFrame title={tab.title} key={tab.id}>
            <tab.Panel />
          </AppFrame>
        </div>
      </div>
    </Section>
  );
}
