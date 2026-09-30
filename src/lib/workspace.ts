import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Workspace = Tables<"workspaces">;

export const PLAN_LIMITS: Record<string, number> = { starter: 50, growth: 1000, scale: 5000 };
export const planLabel = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

/** The signed-in user's workspace (first membership). */
export async function fetchWorkspace(): Promise<Workspace | null> {
  const { data, error } = await supabase.from("workspaces").select("*").order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMonthlyUsage(workspaceId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export type BusinessProfile = Pick<Workspace, "name" | "industry" | "website" | "offer" | "target_customer" | "value_proposition" | "tone">;

export async function saveBusinessProfile(id: string, p: BusinessProfile, finishOnboarding = false) {
  const patch: Record<string, unknown> = { ...p, updated_at: new Date().toISOString() };
  if (finishOnboarding) patch["onboarded_at"] = new Date().toISOString();
  const { error } = await supabase.from("workspaces").update(patch).eq("id", id);
  if (error) throw error;
}
