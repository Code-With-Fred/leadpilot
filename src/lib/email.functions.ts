import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProviderInput = z.object({ provider: z.enum(["google", "microsoft"]) });

export type EmailInbox = {
  id: string;
  provider: "google" | "microsoft";
  email: string;
  display_name: string | null;
  status: "active" | "error" | "disconnected";
  last_error: string | null;
  daily_limit: number;
  sent_today: number;
  last_synced_at: string | null;
  connected_by: string;
};

export type EmailSetup = {
  /** Server has the keys needed to connect each provider. */
  providers: { google: boolean; microsoft: boolean };
  inboxLimit: number;
  inboxes: EmailInbox[];
};

export const getEmailSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailSetup> => {
    const { providerConfigured } = await import("./email/providers.server");
    const { emailCryptoConfigured } = await import("./email/crypto.server");
    const { INBOX_LIMITS, sentToday } = await import("./email/engine.server");
    const { data: wsId } = await context.supabase.rpc("current_workspace_id");
    const [{ data: ws }, { data: rows }] = await Promise.all([
      context.supabase.from("workspaces").select("plan").eq("id", wsId ?? "").maybeSingle(),
      context.supabase
        .from("email_accounts")
        .select("id, provider, email, display_name, status, last_error, daily_limit, last_synced_at, connected_by")
        .eq("workspace_id", wsId ?? "")
        .order("created_at"),
    ]);
    const crypto = emailCryptoConfigured();
    const inboxes = await Promise.all(
      (rows ?? []).map(async (r) => ({ ...r, sent_today: await sentToday(r.id) }) as EmailInbox),
    );
    return {
      providers: { google: crypto && providerConfigured("google"), microsoft: crypto && providerConfigured("microsoft") },
      inboxLimit: INBOX_LIMITS[ws?.plan ?? "starter"] ?? 1,
      inboxes,
    };
  });

export const startEmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProviderInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
    const { authorizeUrl, providerConfigured } = await import("./email/providers.server");
    const { emailCryptoConfigured, signState, b64url } = await import("./email/crypto.server");
    const { INBOX_LIMITS, appUrl } = await import("./email/engine.server");
    if (!providerConfigured(data.provider) || !emailCryptoConfigured()) {
      return { ok: false, error: "Email connections aren't set up on this server yet." };
    }
    const { data: wsId } = await context.supabase.rpc("current_workspace_id");
    if (!wsId) return { ok: false, error: "No workspace found." };
    const [{ data: ws }, { count }] = await Promise.all([
      context.supabase.from("workspaces").select("plan").eq("id", wsId).single(),
      context.supabase.from("email_accounts").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
    ]);
    const limit = INBOX_LIMITS[ws?.plan ?? "starter"] ?? 1;
    if ((count ?? 0) >= limit) {
      return { ok: false, error: `Your plan includes ${limit} sending inbox${limit === 1 ? "" : "es"}. Remove one or upgrade to add more.` };
    }
    const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const state = await signState({ ws: wsId, uid: context.userId, p: data.provider, n: nonce, exp: Date.now() + 10 * 60_000 });
    // The nonce cookie ties the callback to this browser, so a link crafted by someone
    // else can't attach your mailbox to their workspace.
    setCookie("lp_oauth_nonce", nonce, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email/oauth", maxAge: 600 });
    const origin = new URL(getRequestUrl()).origin;
    const redirectUri = `${appUrl(origin)}/api/email/oauth/${data.provider}`;
    return { ok: true, url: authorizeUrl(data.provider, redirectUri, state) };
  });

const SendInput = z.object({
  leadId: z.string().uuid(),
  subject: z.string().trim().max(200).default(""),
  body: z.string().trim().min(1).max(5000),
});

export const sendLeadEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; from: string } | { ok: false; error: string }> => {
    // RLS: the lead is only visible if the caller belongs to its workspace.
    const { data: visible } = await context.supabase.from("leads").select("id").eq("id", data.leadId).maybeSingle();
    if (!visible) return { ok: false, error: "Lead not found." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendToLead } = await import("./email/engine.server");
    const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("id", data.leadId).single();
    if (!lead) return { ok: false, error: "Lead not found." };
    const res = await sendToLead({ lead, subject: data.subject, body: data.body, userId: context.userId, origin: new URL(getRequestUrl()).origin });
    return res.ok ? { ok: true, from: res.accountEmail } : { ok: false, error: res.error };
  });

export const sendFollowUpNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ followUpId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; from: string } | { ok: false; error: string }> => {
    const { data: visible } = await context.supabase.from("follow_ups").select("id, channel").eq("id", data.followUpId).maybeSingle();
    if (!visible) return { ok: false, error: "Follow-up not found." };
    if (visible.channel !== "email") return { ok: false, error: "Only email steps can be sent from LeadPilot." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deliverFollowUp } = await import("./email/engine.server");
    // Claim it so the background worker can't send the same step at the same moment.
    const { data: fu } = await supabaseAdmin
      .from("follow_ups")
      .update({ status: "sending", claimed_at: new Date().toISOString() })
      .eq("id", data.followUpId)
      .in("status", ["scheduled", "failed"])
      .select("*")
      .maybeSingle();
    if (!fu) return { ok: false, error: "This step was already sent or is sending right now." };
    const res = await deliverFollowUp(fu, { userId: context.userId, origin: new URL(getRequestUrl()).origin });
    return res.ok ? { ok: true, from: res.accountEmail } : { ok: false, error: res.error };
  });

export const syncRepliesNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; found: number } | { ok: false; error: string }> => {
    const { data: wsId } = await context.supabase.rpc("current_workspace_id");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncInbox } = await import("./email/engine.server");
    const { data: accounts } = await supabaseAdmin.from("email_accounts").select("*").eq("workspace_id", wsId ?? "").eq("status", "active");
    if (!accounts?.length) return { ok: false, error: "Connect a sending inbox in Settings first." };
    let found = 0;
    for (const a of accounts) {
      try {
        found += await syncInbox(a);
      } catch (e) {
        console.error("manual sync failed", a.email, e);
      }
    }
    return { ok: true, found };
  });
