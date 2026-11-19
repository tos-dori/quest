-- Questline cloud save schema (Supabase PostgreSQL)
-- Run once in the Supabase project's SQL Editor.
-- Each signed-in user can read only their own save. All client writes go through
-- a revision-checked RPC to prevent silent overwriting across devices.

CREATE TABLE IF NOT EXISTS public.questline_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  game_state jsonb NOT NULL CHECK (jsonb_typeof(game_state) = 'object' AND game_state->>'v' = '2'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.questline_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS questline_read_own ON public.questline_saves;
CREATE POLICY questline_read_own ON public.questline_saves FOR SELECT
  TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.questline_saves FROM anon, authenticated;
GRANT SELECT ON public.questline_saves TO authenticated;

-- Automatic backup of the previous state before any update, including admin edits.
CREATE TABLE IF NOT EXISTS public.questline_save_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL,
  game_state jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questline_save_history_user_id_id
  ON public.questline_save_history(user_id, id DESC);
ALTER TABLE public.questline_save_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS questline_history_read_own ON public.questline_save_history;
CREATE POLICY questline_history_read_own ON public.questline_save_history FOR SELECT
  TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.questline_save_history FROM anon, authenticated;
GRANT SELECT ON public.questline_save_history TO authenticated;

CREATE OR REPLACE FUNCTION public.questline_archive_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.questline_save_history(user_id, revision, game_state)
  VALUES (OLD.user_id, OLD.revision, OLD.game_state);
  DELETE FROM public.questline_save_history
   WHERE user_id = OLD.user_id AND id NOT IN (
     SELECT id FROM public.questline_save_history
     WHERE user_id = OLD.user_id ORDER BY id DESC LIMIT 30
   );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS questline_backup_before_update ON public.questline_saves;
CREATE TRIGGER questline_backup_before_update
BEFORE UPDATE ON public.questline_saves FOR EACH ROW
EXECUTE FUNCTION public.questline_archive_before_update();

CREATE OR REPLACE FUNCTION public.questline_save(p_state jsonb, p_expected_revision bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  who uuid := auth.uid();
  next_revision bigint;
BEGIN
  IF who IS NULL THEN RAISE EXCEPTION 'QUESTLINE_NOT_AUTHENTICATED'; END IF;
  IF p_state IS NULL OR jsonb_typeof(p_state) <> 'object'
     OR p_state->>'v' <> '2' OR octet_length(p_state::text) > 2097152 THEN
    RAISE EXCEPTION 'QUESTLINE_INVALID_SAVE';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'QUESTLINE_INVALID_REVISION';
  END IF;

  IF p_expected_revision = 0 THEN
    INSERT INTO public.questline_saves(user_id, game_state, revision)
    VALUES (who, p_state, 1) ON CONFLICT DO NOTHING
    RETURNING revision INTO next_revision;
  ELSE
    UPDATE public.questline_saves
       SET game_state = p_state, revision = revision + 1, updated_at = now()
     WHERE user_id = who AND revision = p_expected_revision
    RETURNING revision INTO next_revision;
  END IF;

  IF next_revision IS NULL THEN RAISE EXCEPTION 'QUESTLINE_REVISION_CONFLICT'; END IF;
  RETURN next_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.questline_save(jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.questline_save(jsonb, bigint) TO authenticated;