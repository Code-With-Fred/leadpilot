import { useCallback, useEffect, useState } from "react";

import type { LeadStatus } from "@/components/product/status-badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type LeadRow = Tables<"leads">;

export interface LeadResearch {
  overview: string;
  products: string;
  targetCustomers: string;
  websiteNotes: string;
  buyingSignals: string[];
  painPoints: string[];
  salesAngle: string;
  scoreReasons: string[];
  recommendation: string;
  generatedAt: string;
}

export interface ReplyAnalysis {
  intent: "interested" | "question" | "objection" | "not_now" | "not_interested" | "referral" | "out_of_office";
  sentiment: "positive" | "neutral" | "negative";
  urgency: "high" | "medium" | "low";
  summary: string;
  nextAction: string;
  suggestedReply: string;
}

export const STAGES = ["new", "contacted", "warm", "interested", "qualified", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const stageLabel = (s: string): LeadStatus =>
  (s.charAt(0).toUpperCase() + s.slice(1)) as LeadStatus;

export const INTENT_LABEL: Record<ReplyAnalysis["intent"], string> = {
  interested: "Interested",
  question: "Has a question",
  objection: "Objection",
  not_now: "Not right now",
  not_interested: "Not interested",
  referral: "Referred someone else",
  out_of_office: "Out of office",
};

export const LEADS_EVENT = "leadpilot:leads-changed";
export const notifyLeadsChanged = () => window.dispatchEvent(new Event(LEADS_EVENT));

export function useLeads() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) setError("Couldn't load your leads.");
    else {
      setError(null);
      setLeads(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(LEADS_EVENT, load);
    return () => window.removeEventListener(LEADS_EVENT, load);
  }, [load]);

  return { leads, loading, error, reload: load };
}

const DAY = 864e5;

/** Rule-based "what needs attention" computed from real lead data. */
export function recommendedActions(leads: LeadRow[]) {
  const now = Date.now();
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const followUp = open.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() <= now);
  const highIntent = open.filter((l) => l.stage === "interested");
  const readyForCall = open.filter((l) => l.stage === "qualified" || (l.stage === "warm" && (l.score ?? 0) >= 75));
  const needResearch = open.filter((l) => !l.research);
  const cold = open.filter(
    (l) =>
      ["contacted", "warm"].includes(l.stage) &&
      l.last_contacted_at &&
      now - new Date(l.last_contacted_at).getTime() > 14 * DAY &&
      !l.next_follow_up_at,
  );
  return [
    { key: "follow", label: "need follow up", leads: followUp, tone: "primary" as const },
    { key: "intent", label: "interested replies need attention", leads: highIntent, tone: "success" as const },
    { key: "call", label: "ready for a sales call", leads: readyForCall, tone: "success" as const },
    { key: "research", label: "new leads need research", leads: needResearch, tone: "primary" as const },
    { key: "cold", label: "opportunities going cold", leads: cold, tone: "warning" as const },
  ];
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
