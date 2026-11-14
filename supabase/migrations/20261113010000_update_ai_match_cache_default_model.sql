-- Update default model_used on ai_match_cache from gpt-4o-mini to gpt-6-luna
ALTER TABLE public.ai_match_cache
ALTER COLUMN model_used SET DEFAULT 'gpt-6-luna'::text;

