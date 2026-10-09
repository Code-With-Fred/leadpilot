-- Connected sending inboxes (Gmail / Microsoft 365). OAuth tokens are encrypted by the
-- server and are never readable by signed-in users: only non-secret columns are granted.
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('google','microsoft')),
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','error','disconnected')),
  last_error text,
  daily_limit integer NOT NULL DEFAULT 40 CHECK (daily_limit BETWEEN 1 AND 200),
  refresh_token_enc text,
  access_token_enc text,
  access_token_expires_at timestamptz,
  sync_cursor text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
CREATE INDEX email_accounts_ws_idx ON public.email_accounts(workspace_id);
GRANT SELECT (id, workspace_id, connected_by, provider, email, display_name, status, last_error, daily_limit, last_synced_at, created_at, updated_at)
  ON public.email_accounts TO authenticated;
GRANT UPDATE (daily_limit, display_name, updated_at) ON public.email_accounts TO authenticated;
GRANT DELETE ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read inboxes" ON public.email_accounts FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins update inboxes" ON public.email_accounts FOR UPDATE TO authenticated
  USING (public.workspace_role(workspace_id) IN ('owner','admin') OR connected_by = auth.uid());
CREATE POLICY "Admins remove inboxes" ON public.email_accounts FOR DELETE TO authenticated
  USING (public.workspace_role(workspace_id) IN ('owner','admin') OR connected_by = auth.uid());

-- One email conversation per lead per inbox, so follow-ups land in the same thread.
CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  email_account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  provider_thread_id text NOT NULL,
  subject text NOT NULL DEFAULT '',
  last_message_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_account_id, lead_id)
);
CREATE INDEX email_threads_thread_idx ON public.email_threads(email_account_id, provider_thread_id);
GRANT SELECT ON public.email_threads TO authenticated;
GRANT ALL ON public.email_threads TO service_role;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read threads" ON public.email_threads FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

-- Booking link used in {{booking_link}} and plan-gated inbox count
ALTER TABLE public.workspaces ADD COLUMN booking_url text;
GRANT UPDATE (booking_url) ON public.workspaces TO authenticated;

-- Campaigns can send on their own
ALTER TABLE public.campaigns ADD COLUMN auto_send boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN email_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL;

-- Follow-up delivery state
ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_status_check;
ALTER TABLE public.follow_ups ADD CONSTRAINT follow_ups_status_check
  CHECK (status IN ('scheduled','sending','sent','done','skipped','paused','failed'));
ALTER TABLE public.follow_ups ADD COLUMN email_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.follow_ups ADD COLUMN last_error text;
ALTER TABLE public.follow_ups ADD COLUMN claimed_at timestamptz;
CREATE INDEX follow_ups_send_idx ON public.follow_ups(status, due_at) WHERE status IN ('scheduled','sending');

-- Messages carry the inbox + provider id so synced replies are never duplicated
ALTER TABLE public.lead_messages ADD COLUMN email_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.lead_messages ADD COLUMN external_id text;
ALTER TABLE public.lead_messages ADD COLUMN subject text;
CREATE UNIQUE INDEX lead_messages_external_uidx ON public.lead_messages(email_account_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX lead_messages_sent_idx ON public.lead_messages(email_account_id, created_at) WHERE direction = 'out';

-- Opt-out
ALTER TABLE public.leads ADD COLUMN unsubscribed_at timestamptz;
ALTER TABLE public.leads ADD COLUMN unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex');
CREATE UNIQUE INDEX leads_unsubscribe_token_uidx ON public.leads(unsubscribe_token);
CREATE INDEX leads_ws_email_idx ON public.leads(workspace_id, lower(contact_email)) WHERE contact_email IS NOT NULL;

-- A reply (synced or pasted) pauses that lead's sequence and warms the lead up.
CREATE OR REPLACE FUNCTION public.pause_sequence_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.direction = 'in' THEN
    UPDATE public.follow_ups SET status = 'paused' WHERE lead_id = NEW.lead_id AND status = 'scheduled';
    UPDATE public.campaign_leads SET status = 'replied' WHERE lead_id = NEW.lead_id AND status = 'active';
    UPDATE public.leads SET next_follow_up_at = NULL,
           stage = CASE WHEN stage IN ('new','contacted') THEN 'warm' ELSE stage END
     WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lead_messages_pause_on_reply AFTER INSERT ON public.lead_messages
  FOR EACH ROW EXECUTE FUNCTION public.pause_sequence_on_reply();

-- Resume a paused sequence: remaining steps keep their spacing, starting tomorrow.
CREATE OR REPLACE FUNCTION public.resume_lead_sequence(_lead uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid; first_due timestamptz; n integer;
BEGIN
  SELECT workspace_id INTO ws FROM public.leads WHERE id = _lead;
  IF ws IS NULL OR NOT public.is_workspace_member(ws) THEN RETURN 0; END IF;
  SELECT min(due_at) INTO first_due FROM public.follow_ups WHERE lead_id = _lead AND status = 'paused';
  IF first_due IS NULL THEN RETURN 0; END IF;
  UPDATE public.follow_ups
     SET status = 'scheduled', due_at = now() + interval '1 day' + (due_at - first_due)
   WHERE lead_id = _lead AND status = 'paused';
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.campaign_leads SET status = 'active' WHERE lead_id = _lead AND status = 'replied';
  UPDATE public.leads SET next_follow_up_at = (SELECT min(due_at) FROM public.follow_ups WHERE lead_id = _lead AND status = 'scheduled')
   WHERE id = _lead;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.resume_lead_sequence(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resume_lead_sequence(uuid) TO authenticated;

-- Worker claim: due auto-send emails, locked so overlapping runs never double-send.
CREATE OR REPLACE FUNCTION public.claim_due_follow_ups(_limit integer)
RETURNS SETOF public.follow_ups LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- A run that died mid-send leaves rows in 'sending'; never resend those blindly.
  UPDATE public.follow_ups SET status = 'failed', last_error = 'Sending was interrupted. Check the inbox before retrying.'
   WHERE status = 'sending' AND claimed_at < now() - interval '15 minutes';
  RETURN QUERY
  UPDATE public.follow_ups f SET status = 'sending', claimed_at = now()
   WHERE f.id IN (
     SELECT f2.id FROM public.follow_ups f2
       JOIN public.campaigns c ON c.id = f2.campaign_id
       JOIN public.campaign_leads cl ON cl.campaign_id = f2.campaign_id AND cl.lead_id = f2.lead_id
       JOIN public.leads l ON l.id = f2.lead_id
      WHERE f2.status = 'scheduled' AND f2.channel = 'email' AND f2.due_at <= now()
        AND c.status = 'active' AND c.auto_send AND cl.status = 'active'
        AND l.contact_email IS NOT NULL AND l.unsubscribed_at IS NULL AND l.stage NOT IN ('won','lost')
        AND EXISTS (SELECT 1 FROM public.email_accounts a WHERE a.workspace_id = f2.workspace_id AND a.status = 'active')
      ORDER BY f2.due_at
      LIMIT _limit
      FOR UPDATE OF f2 SKIP LOCKED)
  RETURNING f.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_due_follow_ups(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_follow_ups(integer) TO service_role;
