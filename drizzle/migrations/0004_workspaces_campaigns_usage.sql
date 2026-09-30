-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  website text,
  offer text,
  target_customer text,
  value_proposition text,
  tone text NOT NULL DEFAULT 'professional',
  onboarded_at timestamptz,
  plan text NOT NULL DEFAULT 'starter',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON public.workspace_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.workspace_role(_ws uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members WHERE workspace_id = _ws AND user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1
$$;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read workspace" ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id));
CREATE POLICY "Admins update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (public.workspace_role(id) IN ('owner','admin'));
CREATE POLICY "Members read members" ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Owners manage members" ON public.workspace_members FOR DELETE TO authenticated USING (public.workspace_role(workspace_id) = 'owner' AND user_id <> auth.uid());

-- New users get their own workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE ws uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'company');
  INSERT INTO public.workspaces (name, created_by)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company',''), 'My workspace'), NEW.id) RETURNING id INTO ws;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws, NEW.id, 'owner');
  RETURN NEW;
END; $function$;

-- Backfill workspaces for existing users
DO $$ DECLARE p record; ws uuid;
BEGIN
  FOR p IN SELECT id, company FROM public.profiles WHERE NOT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.user_id = profiles.id) LOOP
    INSERT INTO public.workspaces (name, created_by) VALUES (COALESCE(NULLIF(p.company,''), 'My workspace'), p.id) RETURNING id INTO ws;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws, p.id, 'owner');
  END LOOP;
END $$;

-- Scope existing tables to workspaces
ALTER TABLE public.leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT public.current_workspace_id();
ALTER TABLE public.lead_replies ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT public.current_workspace_id();
ALTER TABLE public.saved_outreach ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT public.current_workspace_id();
UPDATE public.leads t SET workspace_id = (SELECT workspace_id FROM public.workspace_members m WHERE m.user_id = t.user_id ORDER BY created_at LIMIT 1) WHERE workspace_id IS NULL;
UPDATE public.lead_replies t SET workspace_id = (SELECT workspace_id FROM public.workspace_members m WHERE m.user_id = t.user_id ORDER BY created_at LIMIT 1) WHERE workspace_id IS NULL;
UPDATE public.saved_outreach t SET workspace_id = (SELECT workspace_id FROM public.workspace_members m WHERE m.user_id = t.user_id ORDER BY created_at LIMIT 1) WHERE workspace_id IS NULL;
CREATE INDEX leads_workspace_idx ON public.leads(workspace_id, created_at DESC);
CREATE INDEX lead_replies_workspace_idx ON public.lead_replies(workspace_id);
CREATE INDEX saved_outreach_workspace_idx ON public.saved_outreach(workspace_id, created_at DESC);

DROP POLICY IF EXISTS "Own leads read" ON public.leads;
DROP POLICY IF EXISTS "Own leads insert" ON public.leads;
DROP POLICY IF EXISTS "Own leads update" ON public.leads;
DROP POLICY IF EXISTS "Own leads delete" ON public.leads;
CREATE POLICY "Workspace leads read" ON public.leads FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());
CREATE POLICY "Workspace leads update" ON public.leads FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace leads delete" ON public.leads FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Own replies read" ON public.lead_replies;
DROP POLICY IF EXISTS "Own replies insert" ON public.lead_replies;
DROP POLICY IF EXISTS "Own replies delete" ON public.lead_replies;
CREATE POLICY "Workspace replies read" ON public.lead_replies FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace replies insert" ON public.lead_replies FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());
CREATE POLICY "Workspace replies delete" ON public.lead_replies FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Own outreach read" ON public.saved_outreach;
DROP POLICY IF EXISTS "Own outreach insert" ON public.saved_outreach;
DROP POLICY IF EXISTS "Own outreach delete" ON public.saved_outreach;
CREATE POLICY "Workspace outreach read" ON public.saved_outreach FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace outreach insert" ON public.saved_outreach FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());
CREATE POLICY "Workspace outreach delete" ON public.saved_outreach FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));

-- Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT public.current_workspace_id(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.campaign_leads (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','replied','completed','removed')),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, lead_id)
);
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'email',
  subject text,
  body text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','skipped')),
  completed_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_ws_idx ON public.campaigns(workspace_id, created_at DESC);
CREATE INDEX campaign_leads_lead_idx ON public.campaign_leads(lead_id);
CREATE INDEX follow_ups_due_idx ON public.follow_ups(workspace_id, status, due_at);
CREATE INDEX follow_ups_lead_idx ON public.follow_ups(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns, public.campaign_leads, public.follow_ups TO authenticated;
GRANT ALL ON public.campaigns, public.campaign_leads, public.follow_ups TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace campaigns" ON public.campaigns FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace campaign leads" ON public.campaign_leads FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace follow ups" ON public.follow_ups FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- AI usage metering (server-written only)
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_ws_idx ON public.usage_events(workspace_id, created_at DESC);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read usage" ON public.usage_events FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

-- Atomic check-and-record of AI usage against the workspace plan
CREATE OR REPLACE FUNCTION public.consume_ai_credit(_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid; p text; lim int; used int;
BEGIN
  ws := public.current_workspace_id();
  IF ws IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_workspace'); END IF;
  SELECT plan INTO p FROM public.workspaces WHERE id = ws FOR UPDATE;
  lim := CASE p WHEN 'growth' THEN 1000 WHEN 'scale' THEN 5000 ELSE 50 END;
  SELECT count(*) INTO used FROM public.usage_events WHERE workspace_id = ws AND created_at >= date_trunc('month', now());
  IF used >= lim THEN RETURN jsonb_build_object('ok', false, 'reason', 'limit', 'used', used, 'limit', lim, 'plan', p); END IF;
  INSERT INTO public.usage_events (workspace_id, user_id, kind) VALUES (ws, auth.uid(), _kind);
  RETURN jsonb_build_object('ok', true, 'used', used + 1, 'limit', lim, 'plan', p);
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_credit(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text) TO authenticated;