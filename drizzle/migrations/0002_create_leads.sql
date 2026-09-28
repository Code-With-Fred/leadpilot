CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company text NOT NULL,
  contact_name text,
  contact_email text,
  role text,
  industry text,
  location text,
  website text,
  notes text,
  stage text NOT NULL DEFAULT 'new',
  score integer,
  research jsonb,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own leads read" ON public.leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own leads insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own leads update" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own leads delete" ON public.leads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX leads_user_idx ON public.leads(user_id, created_at DESC);

CREATE TABLE public.lead_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  reply text NOT NULL,
  analysis jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.lead_replies TO authenticated;
GRANT ALL ON public.lead_replies TO service_role;
ALTER TABLE public.lead_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own replies read" ON public.lead_replies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own replies insert" ON public.lead_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own replies delete" ON public.lead_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);