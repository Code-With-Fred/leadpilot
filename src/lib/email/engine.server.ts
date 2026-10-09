// The sending engine: token refresh, inbox rotation, daily caps, merge tags, threading,
// automatic follow-ups and reply sync. Runs with the service role — callers must check access.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables } from "@/integrations/supabase/types";

import { decryptSecret, encryptSecret } from "./crypto.server";
import { fetchReplies, ProviderError, refreshAccess, sendEmail, type Provider } from "./providers.server";

type Account = Tables<"email_accounts">;
type Lead = Tables<"leads">;
type Thread = Tables<"email_threads">;

/** Inboxes a workspace can connect, by plan. */
export const INBOX_LIMITS: Record<string, number> = { starter: 1, growth: 3, scale: 10 };
/** Emails per connected inbox per worker run, so sends are spread out instead of bursting. */
const PER_RUN_PER_INBOX = 3;

export function appUrl(fallbackOrigin?: string): string {
  const u = process.env["APP_URL"] || fallbackOrigin || "";
  return u.replace(/\/+$/, "");
}

export const unsubscribeUrl = (token: string, origin?: string) => `${appUrl(origin)}/unsubscribe/${token}`;

const startOfUtcDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

export async function sentToday(accountId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("lead_messages")
    .select("id", { count: "exact", head: true })
    .eq("email_account_id", accountId)
    .eq("direction", "out")
    .gte("created_at", startOfUtcDay());
  return count ?? 0;
}

async function markAccountError(acc: Account, message: string) {
  await supabaseAdmin.from("email_accounts").update({ status: "error", last_error: message.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", acc.id);
}

/** A valid access token, refreshed (and re-stored) when it is about to expire. */
export async function accessToken(acc: Account): Promise<string> {
  const exp = acc.access_token_expires_at ? new Date(acc.access_token_expires_at).getTime() : 0;
  if (acc.access_token_enc && exp - Date.now() > 120_000) return decryptSecret(acc.access_token_enc);
  if (!acc.refresh_token_enc) throw new ProviderError("This inbox needs to be reconnected.", 401, true);
  try {
    const t = await refreshAccess(acc.provider as Provider, await decryptSecret(acc.refresh_token_enc));
    const patch: Partial<Account> = {
      access_token_enc: await encryptSecret(t.accessToken),
      access_token_expires_at: new Date(Date.now() + t.expiresIn * 1000).toISOString(),
      status: "active",
      last_error: null,
    };
    if (t.refreshToken) patch.refresh_token_enc = await encryptSecret(t.refreshToken);
    await supabaseAdmin.from("email_accounts").update(patch).eq("id", acc.id);
    Object.assign(acc, patch);
    return t.accessToken;
  } catch (e) {
    if (e instanceof ProviderError && e.auth) await markAccountError(acc, "Access was revoked or expired. Reconnect this inbox.");
    throw e;
  }
}

// ---------- templating ----------

export function renderTemplate(text: string, lead: Pick<Lead, "contact_name" | "company">, ws: { booking_url: string | null; name: string }): string {
  const first = (lead.contact_name ?? "").trim().split(/\s+/)[0] || "there";
  const vars: Record<string, string> = {
    first_name: first,
    name: lead.contact_name?.trim() || first,
    company: lead.company,
    booking_link: ws.booking_url ?? "",
    my_company: ws.name,
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m: string, k: string) => vars[k] ?? m).replace(/\n{3,}/g, "\n\n").trim();
}

const withFooter = (body: string, unsubUrl: string) => `${body}\n\n--\nNot interested? Reply "no thanks" or unsubscribe here: ${unsubUrl}`;

// ---------- sending ----------

/** Thread for this lead on any active inbox (conversations stay on the inbox that started them). */
async function existingThread(lead: Lead, accounts: Account[]): Promise<{ thread: Thread; account: Account } | null> {
  if (!accounts.length) return null;
  const { data } = await supabaseAdmin
    .from("email_threads")
    .select("*")
    .eq("lead_id", lead.id)
    .in("email_account_id", accounts.map((a) => a.id))
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const account = accounts.find((a) => a.id === data.email_account_id)!;
  return { thread: data, account };
}

export type SendResult = { ok: true; accountEmail: string } | { ok: false; error: string; retryLater?: boolean };

/**
 * Sends one email to a lead, threading onto the previous conversation when there is one,
 * and records it in the lead's inbox. `preferredAccountId` wins only for a new conversation.
 */
export async function sendToLead(opts: {
  lead: Lead;
  subject: string;
  body: string;
  preferredAccountId?: string | null | undefined;
  userId?: string | undefined;
  origin?: string | undefined;
  sentCounts?: Map<string, number> | undefined;
}): Promise<SendResult> {
  const { lead } = opts;
  if (!lead.workspace_id) return { ok: false, error: "Lead has no workspace." };
  if (!lead.contact_email) return { ok: false, error: "This lead has no email address." };
  if (lead.unsubscribed_at) return { ok: false, error: "This lead unsubscribed." };

  const [{ data: accounts }, { data: ws }] = await Promise.all([
    supabaseAdmin.from("email_accounts").select("*").eq("workspace_id", lead.workspace_id).eq("status", "active").order("created_at"),
    supabaseAdmin.from("workspaces").select("name, booking_url").eq("id", lead.workspace_id).single(),
  ]);
  if (!accounts?.length) return { ok: false, error: "Connect a sending inbox in Settings first.", retryLater: true };

  const counts = opts.sentCounts ?? new Map<string, number>();
  const used = async (a: Account) => {
    if (!counts.has(a.id)) counts.set(a.id, await sentToday(a.id));
    return counts.get(a.id)!;
  };

  const prior = await existingThread(lead, accounts);
  let account: Account | undefined = prior?.account;
  if (!account) {
    const preferred = accounts.find((a) => a.id === opts.preferredAccountId);
    if (preferred && (await used(preferred)) < preferred.daily_limit) account = preferred;
    else {
      // Rotate: the inbox with the most room left today.
      let best: { a: Account; room: number } | null = null;
      for (const a of accounts) {
        const room = a.daily_limit - (await used(a));
        if (room > 0 && (!best || room > best.room)) best = { a, room };
      }
      account = best?.a;
    }
  }
  if (!account || (await used(account)) >= account.daily_limit) {
    return { ok: false, error: "Daily sending limit reached. It will go out tomorrow.", retryLater: true };
  }

  const wsInfo = { name: ws?.name ?? "", booking_url: ws?.booking_url ?? null };
  const subject = renderTemplate(opts.subject, lead, wsInfo) || `Quick question for ${lead.company}`;
  const text = renderTemplate(opts.body, lead, wsInfo);
  if (!text) return { ok: false, error: "The message is empty." };
  const unsub = unsubscribeUrl(lead.unsubscribe_token, opts.origin);

  try {
    const token = await accessToken(account);
    const sent = await sendEmail(
      account.provider as Provider,
      token,
      {
        from: { email: account.email, name: account.display_name },
        to: { email: lead.contact_email, name: lead.contact_name },
        subject,
        text: withFooter(text, unsub),
        unsubscribeUrl: unsub,
        thread: prior ? { threadId: prior.thread.provider_thread_id, ref: prior.thread.last_message_ref } : undefined,
      },
      prior?.thread.subject ?? subject,
    );
    counts.set(account.id, (counts.get(account.id) ?? 0) + 1);
    const now = new Date().toISOString();
    await supabaseAdmin.from("email_threads").upsert(
      {
        workspace_id: lead.workspace_id,
        lead_id: lead.id,
        email_account_id: account.id,
        provider_thread_id: sent.threadId,
        subject: prior?.thread.subject ?? subject,
        last_message_ref: sent.ref,
        updated_at: now,
      },
      { onConflict: "email_account_id,lead_id" },
    );
    await supabaseAdmin.from("lead_messages").insert({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      user_id: opts.userId ?? account.connected_by,
      direction: "out",
      channel: "email",
      subject: prior ? null : subject,
      body: text.slice(0, 5000),
      email_account_id: account.id,
      external_id: sent.messageId,
    });
    await supabaseAdmin
      .from("leads")
      .update({ last_contacted_at: now, ...(lead.stage === "new" ? { stage: "contacted" } : {}) })
      .eq("id", lead.id);
    return { ok: true, accountEmail: account.email };
  } catch (e) {
    console.error("send failed", account.email, e);
    if (e instanceof ProviderError && e.auth) return { ok: false, error: "The sending inbox needs to be reconnected in Settings.", retryLater: true };
    if (e instanceof ProviderError && (e.status === 429 || e.status >= 500)) return { ok: false, error: "The email provider is busy. It will retry shortly.", retryLater: true };
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Sending failed." };
  }
}

async function refreshNextFollowUp(leadId: string) {
  const { data: next } = await supabaseAdmin
    .from("follow_ups")
    .select("due_at")
    .eq("lead_id", leadId)
    .eq("status", "scheduled")
    .order("due_at")
    .limit(1)
    .maybeSingle();
  await supabaseAdmin.from("leads").update({ next_follow_up_at: next?.due_at ?? null }).eq("id", leadId);
}

/** Sends one follow-up and records the outcome on it. Used by the worker and by "Send now". */
export async function deliverFollowUp(
  fu: Tables<"follow_ups">,
  ctx: { userId?: string | undefined; origin?: string | undefined; sentCounts?: Map<string, number> } = {},
): Promise<SendResult> {
  const [{ data: lead }, { data: campaign }] = await Promise.all([
    supabaseAdmin.from("leads").select("*").eq("id", fu.lead_id).single(),
    fu.campaign_id ? supabaseAdmin.from("campaigns").select("email_account_id").eq("id", fu.campaign_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!lead) {
    await supabaseAdmin.from("follow_ups").update({ status: "skipped", completed_at: new Date().toISOString() }).eq("id", fu.id);
    return { ok: false, error: "Lead not found." };
  }
  const res = await sendToLead({
    lead,
    subject: fu.subject ?? "",
    body: fu.body,
    preferredAccountId: fu.email_account_id ?? campaign?.email_account_id,
    userId: ctx.userId,
    origin: ctx.origin,
    sentCounts: ctx.sentCounts,
  });
  const now = new Date().toISOString();
  if (res.ok) {
    await supabaseAdmin.from("follow_ups").update({ status: "sent", completed_at: now, last_error: null }).eq("id", fu.id);
  } else if (res.retryLater) {
    await supabaseAdmin.from("follow_ups").update({ status: "scheduled", claimed_at: null, last_error: res.error }).eq("id", fu.id);
  } else {
    await supabaseAdmin.from("follow_ups").update({ status: "failed", last_error: res.error }).eq("id", fu.id);
  }
  await refreshNextFollowUp(fu.lead_id);
  return res;
}

// ---------- reply sync ----------

export async function syncInbox(acc: Account): Promise<number> {
  const { data: threads } = await supabaseAdmin.from("email_threads").select("*").eq("email_account_id", acc.id);
  const byThread = new Map((threads ?? []).map((t) => [t.provider_thread_id, t]));
  const token = await accessToken(acc);
  const { cursor, messages } = await fetchReplies(acc.provider as Provider, token, acc.sync_cursor, new Set(byThread.keys()));
  let saved = 0;
  for (const m of messages) {
    const thread = byThread.get(m.threadId);
    if (!thread || m.fromEmail === acc.email.toLowerCase()) continue;
    const bounce = /mailer-daemon|postmaster/i.test(m.fromEmail);
    const body = (bounce ? `[Delivery failed] ${m.subject}` : m.text || m.subject || "(empty reply)").slice(0, 5000);
    const { error } = await supabaseAdmin.from("lead_messages").insert({
      workspace_id: thread.workspace_id,
      lead_id: thread.lead_id,
      user_id: acc.connected_by,
      direction: "in",
      channel: "email",
      subject: m.subject || null,
      body,
      email_account_id: acc.id,
      external_id: m.id,
      created_at: m.receivedAt,
    });
    if (error && error.code !== "23505") throw error; // 23505: already synced
    if (!error) saved++;
    await supabaseAdmin.from("email_threads").update({ last_message_ref: m.ref ?? thread.last_message_ref, updated_at: new Date().toISOString() }).eq("id", thread.id);
  }
  await supabaseAdmin.from("email_accounts").update({ sync_cursor: cursor, last_synced_at: new Date().toISOString() }).eq("id", acc.id);
  return saved;
}

// ---------- worker ----------

export async function runEmailWorker(opts: { maxSends?: number } = {}) {
  const report = { synced: 0, sent: 0, failed: 0, deferred: 0, syncErrors: 0 };

  // 1. Pull replies first, so nobody gets a follow-up minutes after answering.
  const { data: accounts } = await supabaseAdmin.from("email_accounts").select("*").eq("status", "active");
  for (const acc of accounts ?? []) {
    try {
      report.synced += await syncInbox(acc);
    } catch (e) {
      report.syncErrors++;
      console.error("reply sync failed", acc.email, e);
    }
  }

  // 2. Send what's due on auto-send campaigns.
  const { data: due, error } = await supabaseAdmin.rpc("claim_due_follow_ups", { _limit: opts.maxSends ?? 40 });
  if (error) throw error;
  const sentCounts = new Map<string, number>();
  const inboxes = new Map<string, number>();
  for (const a of accounts ?? []) inboxes.set(a.workspace_id, (inboxes.get(a.workspace_id) ?? 0) + 1);
  const perWorkspace = new Map<string, number>();
  for (const fu of due ?? []) {
    // Each run sends at most a few emails per inbox; the rest go back in the queue.
    const budget = PER_RUN_PER_INBOX * (inboxes.get(fu.workspace_id) ?? 0);
    if ((perWorkspace.get(fu.workspace_id) ?? 0) >= budget) {
      await supabaseAdmin.from("follow_ups").update({ status: "scheduled", claimed_at: null }).eq("id", fu.id);
      report.deferred++;
      continue;
    }
    const res = await deliverFollowUp(fu, { sentCounts });
    if (res.ok) {
      perWorkspace.set(fu.workspace_id, (perWorkspace.get(fu.workspace_id) ?? 0) + 1);
      report.sent++;
    } else if (res.retryLater) report.deferred++;
    else report.failed++;
  }
  return report;
}
