ALTER TABLE public.leads ADD COLUMN phone text;
ALTER TABLE public.leads ADD COLUMN source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.leads ADD COLUMN place_id text;
CREATE UNIQUE INDEX leads_workspace_place_uidx ON public.leads(workspace_id, place_id) WHERE place_id IS NOT NULL;