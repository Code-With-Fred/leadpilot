import {
  CalendarCheck,
  CheckCircle2,
  Filter,
  Globe,
  MapPin,
  Search,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";

import { PanelLabel } from "@/components/product/app-frame";
import { ScoreBar, StatusBadge } from "@/components/product/status-badge";

/* PLACEHOLDER CONTENT — fictional companies used for product previews. */

export function FindPanel() {
  return (
    <div className="grid gap-0 md:grid-cols-[230px_1fr]">
      <aside className="space-y-3 border-b border-border bg-surface-muted/60 p-4 md:border-b-0 md:border-r">
        <PanelLabel>Add leads</PanelLabel>
        <div className="space-y-2">
          {[
            { icon: Search, label: "Search by industry" },
            { icon: Upload, label: "Import CSV" },
            { icon: Globe, label: "From a website list" },
          ].map((o) => (
            <div
              key={o.label}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs shadow-card"
            >
              <o.icon className="size-3.5 text-primary" />
              {o.label}
            </div>
          ))}
        </div>
        <PanelLabel>Filters</PanelLabel>
        <div className="flex flex-wrap gap-1.5">
          {["Houston, TX", "Commercial", "10–200 staff"].map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[0.6875rem] text-muted-foreground"
            >
              <Filter className="size-2.5" />
              {f}
            </span>
          ))}
        </div>
      </aside>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <PanelLabel>68 matches found</PanelLabel>
          <span className="rounded-md bg-primary px-2.5 py-1 text-[0.6875rem] font-medium text-primary-foreground">
            Import 68 leads
          </span>
        </div>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
          {[
            ["Northstar Properties", "Commercial Real Estate · Houston, TX"],
            ["Cedar Ridge Roofing", "Roofing · Katy, TX"],
            ["Orchard HVAC Group", "HVAC · Sugar Land, TX"],
            ["Beacon Legal Partners", "Legal Services · Houston, TX"],
          ].map(([name, meta]) => (
            <li key={name} className="flex items-center gap-3 bg-surface px-3 py-2.5 text-xs">
              <span className="size-3.5 rounded-[4px] border border-border-strong bg-primary/90" />
              <span className="font-medium">{name}</span>
              <span className="ml-auto truncate text-muted-foreground">{meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ResearchPanel() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="rounded-md border border-border bg-surface p-4 shadow-card">
          <h4 className="text-sm font-semibold">Northstar Properties</h4>
          <dl className="mt-3 space-y-2 text-xs">
            {[
              ["Industry", "Commercial Real Estate"],
              ["Location", "Houston, TX"],
              ["Website", "northstarproperties.example"],
              ["Employees", "45–120"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-md border border-border bg-surface p-4 shadow-card">
          <PanelLabel>Lead score</PanelLabel>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-semibold">87</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
            <div className="ml-auto">
              <ScoreBar score={87} />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-primary/20 bg-primary-soft/50 p-4">
        <PanelLabel>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3" /> AI summary
          </span>
        </PanelLabel>
        <p className="mt-2.5 text-sm leading-relaxed">
          “Northstar manages commercial properties across Houston. Their website highlights
          operating costs and property efficiency, making them a potentially strong fit for
          commercial solar services.”
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> Within your target market
        </div>
      </div>
    </div>
  );
}

export function ReachPanel() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_260px]">
      <div className="rounded-md border border-border bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
          To: <span className="font-medium text-foreground">sarah@northstarproperties.example</span>
        </div>
        <div className="space-y-3 p-4 text-sm leading-relaxed">
          <p className="font-medium">Cutting operating costs at your Houston properties</p>
          <p>
            Hi Sarah, I came across Northstar Properties while researching commercial property
            operators in Houston. Your site mentions keeping operating costs predictable across a
            multi-building portfolio.
          </p>
          <p>
            We help operators like you model energy cost reduction per building before committing to
            anything. Worth a 15 minute look at your two largest sites?
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[0.6875rem] font-medium text-primary-foreground">
            <Send className="size-3" /> Approve &amp; send
          </span>
          <span className="rounded-md border border-border px-2.5 py-1 text-[0.6875rem]">Edit</span>
          <span className="rounded-md border border-border px-2.5 py-1 text-[0.6875rem]">
            Regenerate
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <PanelLabel>Personalization used</PanelLabel>
        {["Industry: commercial real estate", "Location: Houston, TX", "Signal: operating costs", "Role: Operations Director"].map(
          (s) => (
            <div
              key={s}
              className="rounded-md border border-border bg-surface-muted px-2.5 py-2 text-xs text-muted-foreground"
            >
              {s}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function FollowUpPanel() {
  const steps = [
    { day: "Day 1", label: "Initial message", state: "Sent" },
    { day: "Day 4", label: "Follow up", state: "Sent" },
    { day: "Day 8", label: "Final follow up", state: "Scheduled" },
  ];
  return (
    <div className="p-4">
      <PanelLabel>Sequence · Houston commercial Q3</PanelLabel>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s.day} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`grid size-6 place-items-center rounded-full border text-[0.625rem] font-semibold ${
                  s.state === "Sent"
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-border bg-surface-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className="flex-1 rounded-md border border-border bg-surface px-3 py-2.5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium">
                  {s.day} · {s.label}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground">{s.state}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pauses automatically as soon as the prospect replies.
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ConvertPanel() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr]">
      <div className="rounded-md border border-success/25 bg-success-soft/50 p-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 className="size-4" /> Meeting booked
        </span>
        <p className="mt-3 text-sm font-medium">Northstar Properties · Sarah Whitfield</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarCheck className="size-3.5" /> Thursday, 10:30 AM · 30 min intro call
        </p>
        <div className="mt-4">
          <StatusBadge status="Qualified" />
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface p-4 shadow-card">
        <PanelLabel>Pipeline impact</PanelLabel>
        <dl className="mt-3 space-y-2.5 text-xs">
          {[
            ["Days from first touch", "6"],
            ["Messages sent", "2"],
            ["Stage", "Qualified → Meeting"],
            ["Owner", "You"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
