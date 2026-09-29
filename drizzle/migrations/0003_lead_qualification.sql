ALTER TABLE public.leads ADD COLUMN interactions text, ADD COLUMN qualification jsonb;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_check CHECK (stage IN ('new','contacted','warm','interested','qualified','won','lost'));
CREATE INDEX IF NOT EXISTS leads_user_stage_idx ON public.leads(user_id, stage);