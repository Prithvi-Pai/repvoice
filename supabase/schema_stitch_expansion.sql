-- ====================================================================
-- SUPABASE MIGRATION: RepVoice Stitch Obsidian Backend Architecture
-- (Fully idempotent: safe to run on fresh or existing databases)
-- ====================================================================

-- 0. ENSURE BASE CORE TABLES EXIST
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_unit TEXT NOT NULL DEFAULT 'kg' CHECK (preferred_unit IN ('kg', 'lbs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs')),
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  rpe NUMERIC(3, 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. EXPAND PROFILES TABLE WITH STITCH SETTINGS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recognition_mode TEXT NOT NULL DEFAULT 'continuous' CHECK (recognition_mode IN ('continuous', 'push_to_talk')),
  ADD COLUMN IF NOT EXISTS spoken_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS beep_on_record BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS microphone_sensitivity TEXT NOT NULL DEFAULT 'aggressive' CHECK (microphone_sensitivity IN ('quiet', 'standard', 'aggressive')),
  ADD COLUMN IF NOT EXISTS default_rest_timer_seconds INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'ultra' CHECK (tier IN ('free', 'pro', 'ultra'));

-- 2. EXPAND WORKOUTS TABLE WITH STITCH TELEMETRY & SNAPSHOTS
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rest_seconds INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_volume NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_sets_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_url TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_location TEXT;

-- 3. EXPAND WORKOUT_SETS TABLE WITH VOICE AND MONOTONIC TIMING
ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS is_voice_logged BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. CREATE WORKOUT PLANS TABLE (FOR SCREEN 4: /plan)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_day TEXT,            -- e.g. "Tomorrow, Oct 25", "Saturday, Oct 27"
  scheduled_date DATE,           -- optional exact calendar target
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATE PLAN EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  target_weight NUMERIC(6, 2) DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'lbs' CHECK (unit IN ('kg', 'lbs')),
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CREATE PERSONAL RECORDS (PR) TABLE (FOR SCREENS 1, 3, 5)
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('max_weight', 'max_reps', 'max_volume')),
  record_value NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lbs' CHECK (unit IN ('kg', 'lbs')),
  reps INTEGER,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_value NUMERIC(10, 2),
  delta NUMERIC(10, 2)
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON public.plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON public.personal_records(user_id, lower(exercise_name));
CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON public.workouts(user_id, completed_at DESC);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- Plans RLS
DROP POLICY IF EXISTS "Users can manage own workout plans" ON public.workout_plans;
CREATE POLICY "Users can manage own workout plans"
  ON public.workout_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Plan Exercises RLS
DROP POLICY IF EXISTS "Users can manage own plan exercises" ON public.plan_exercises;
CREATE POLICY "Users can manage own plan exercises"
  ON public.plan_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_exercises.plan_id AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_exercises.plan_id AND wp.user_id = auth.uid()
    )
  );

-- Personal Records RLS
DROP POLICY IF EXISTS "Users can manage own personal records" ON public.personal_records;
CREATE POLICY "Users can manage own personal records"
  ON public.personal_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. CREATE EXERCISES & EXERCISE ALIASES (IF MISSING)
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise_id ON public.exercise_aliases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_user_id ON public.exercise_aliases(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_canonical_user 
  ON public.exercises (lower(canonical_name), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_aliases_text_user 
  ON public.exercise_aliases (lower(alias_text), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;

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
