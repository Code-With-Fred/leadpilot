CREATE TABLE public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE DEFAULT public.current_workspace_id(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  direction text NOT NULL CHECK (direction IN ('out','in')),
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email','linkedin','call','other')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.lead_messages TO authenticated;
GRANT ALL ON public.lead_messages TO service_role;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX lead_messages_ws_idx ON public.lead_messages(workspace_id, created_at DESC);
CREATE INDEX lead_messages_lead_idx ON public.lead_messages(lead_id, created_at);
CREATE POLICY "Workspace messages read" ON public.lead_messages FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace messages insert" ON public.lead_messages FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.workspace_id = lead_messages.workspace_id));
CREATE POLICY "Workspace messages delete" ON public.lead_messages FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));