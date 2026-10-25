-- Migration: Add exercises and exercise_aliases tables with Row Level Security (RLS)
-- Enables RepVoice to learn canonical exercises and speech aliases persistently per user

-- 1. Create Exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Exercise Aliases table
CREATE TABLE IF NOT EXISTS public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise_id ON public.exercise_aliases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_user_id ON public.exercise_aliases(user_id);

-- 4. Case-insensitive unique indexes to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_canonical_user 
  ON public.exercises (lower(canonical_name), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_aliases_text_user 
  ON public.exercise_aliases (lower(alias_text), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for exercises
DROP POLICY IF EXISTS "Users can select public or own exercises" ON public.exercises;
CREATE POLICY "Users can select public or own exercises"
  ON public.exercises FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exercises" ON public.exercises;
CREATE POLICY "Users can insert own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own exercises" ON public.exercises;
CREATE POLICY "Users can update own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own exercises" ON public.exercises;
CREATE POLICY "Users can delete own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS Policies for exercise_aliases
DROP POLICY IF EXISTS "Users can select public or own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can select public or own aliases"
  ON public.exercise_aliases FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can insert own aliases"
  ON public.exercise_aliases FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can update own aliases"
  ON public.exercise_aliases FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can delete own aliases"
  ON public.exercise_aliases FOR DELETE
  USING (auth.uid() = user_id);
