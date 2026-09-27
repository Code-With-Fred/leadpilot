CREATE TABLE public.saved_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'message',
  title text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.saved_outreach TO authenticated;
GRANT ALL ON public.saved_outreach TO service_role;
ALTER TABLE public.saved_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own outreach read" ON public.saved_outreach FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own outreach insert" ON public.saved_outreach FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own outreach delete" ON public.saved_outreach FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX saved_outreach_user_idx ON public.saved_outreach (user_id, created_at DESC);