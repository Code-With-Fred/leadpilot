ALTER TABLE public.profiles ADD COLUMN active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.active_workspace_id FROM public.profiles p
       JOIN public.workspace_members m ON m.workspace_id = p.active_workspace_id AND m.user_id = p.id
      WHERE p.id = auth.uid()),
    (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1))
$$;

CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workspace_invites_ws_idx ON public.workspace_invites(workspace_id);
GRANT SELECT, INSERT, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read invites" ON public.workspace_invites FOR SELECT TO authenticated USING (public.workspace_role(workspace_id) IN ('owner','admin'));
CREATE POLICY "Admins create invites" ON public.workspace_invites FOR INSERT TO authenticated WITH CHECK (public.workspace_role(workspace_id) IN ('owner','admin') AND created_by = auth.uid());
CREATE POLICY "Admins delete invites" ON public.workspace_invites FOR DELETE TO authenticated USING (public.workspace_role(workspace_id) IN ('owner','admin'));

-- Accept an invite: email must match the signed-in user
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.workspace_invites; em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  IF em IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in'); END IF;
  SELECT * INTO inv FROM public.workspace_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF inv.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'used'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF lower(inv.email) <> lower(em) THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_email'); END IF;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (inv.workspace_id, auth.uid(), inv.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  UPDATE public.workspace_invites SET accepted_at = now() WHERE id = inv.id;
  UPDATE public.profiles SET active_workspace_id = inv.workspace_id WHERE id = auth.uid();
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;

-- Member list with emails, visible to fellow members only
CREATE OR REPLACE FUNCTION public.workspace_member_list(_ws uuid)
RETURNS TABLE (user_id uuid, email text, full_name text, role text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, u.email::text, p.full_name, m.role, m.created_at
  FROM public.workspace_members m
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.workspace_id = _ws AND public.is_workspace_member(_ws)
  ORDER BY m.created_at
$$;
REVOKE ALL ON FUNCTION public.workspace_member_list(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.workspace_member_list(uuid) TO authenticated;