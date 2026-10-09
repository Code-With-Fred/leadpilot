import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function unsubscribeLead(token: string): Promise<boolean> {
  if (!/^[a-f0-9]{36}$/.test(token)) return false;
  const now = new Date().toISOString();
  const { data: lead } = await supabaseAdmin.from("leads").select("id, unsubscribed_at").eq("unsubscribe_token", token).maybeSingle();
  if (!lead) return false;
  if (!lead.unsubscribed_at) {
    await supabaseAdmin.from("leads").update({ unsubscribed_at: now, next_follow_up_at: null }).eq("id", lead.id);
    await supabaseAdmin.from("follow_ups").update({ status: "skipped", completed_at: now, last_error: "Unsubscribed" })
      .eq("lead_id", lead.id).in("status", ["scheduled", "paused", "failed"]);
    await supabaseAdmin.from("campaign_leads").update({ status: "removed" }).eq("lead_id", lead.id).neq("status", "removed");
  }
  return true;
}
