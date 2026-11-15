-- ====================================================================
-- RepVoice Complete Unified Supabase Database Schema
-- Idempotent: Run this in the Supabase Dashboard -> SQL Editor
-- Sets up core tables, exercises, aliases, plans, PRs, and RLS policies
-- ====================================================================

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_unit TEXT NOT NULL DEFAULT 'lbs' CHECK (preferred_unit IN ('kg', 'lbs')),
  recognition_mode TEXT NOT NULL DEFAULT 'continuous' CHECK (recognition_mode IN ('continuous', 'push_to_talk')),
  spoken_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  beep_on_record BOOLEAN NOT NULL DEFAULT TRUE,
  microphone_sensitivity TEXT NOT NULL DEFAULT 'aggressive' CHECK (microphone_sensitivity IN ('quiet', 'standard', 'aggressive')),
  default_rest_timer_seconds INTEGER NOT NULL DEFAULT 90,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'ultra' CHECK (tier IN ('free', 'pro', 'ultra')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure existing columns exist if profiles was created earlier
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recognition_mode TEXT NOT NULL DEFAULT 'continuous' CHECK (recognition_mode IN ('continuous', 'push_to_talk')),
  ADD COLUMN IF NOT EXISTS spoken_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS beep_on_record BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS microphone_sensitivity TEXT NOT NULL DEFAULT 'aggressive' CHECK (microphone_sensitivity IN ('quiet', 'standard', 'aggressive')),
  ADD COLUMN IF NOT EXISTS default_rest_timer_seconds INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'ultra' CHECK (tier IN ('free', 'pro', 'ultra'));

-- 2. WORKOUTS TABLE
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  avg_rest_seconds INTEGER DEFAULT 60,
  calories_burned INTEGER DEFAULT 0,
  total_volume NUMERIC(10, 2) DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  voice_sets_count INTEGER DEFAULT 0,
  snapshot_url TEXT,
  snapshot_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure new telemetry columns exist
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rest_seconds INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_volume NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_sets_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_url TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_location TEXT;

-- 3. WORKOUT EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORKOUT SETS TABLE
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'lbs' CHECK (unit IN ('kg', 'lbs')),
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  is_voice_logged BOOLEAN NOT NULL DEFAULT TRUE,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rpe NUMERIC(3, 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS is_voice_logged BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 5. EXERCISES TABLE (Canonical dictionary)
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EXERCISE ALIASES TABLE (Voice slang mappings)
CREATE TABLE IF NOT EXISTS public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WORKOUT PLANS TABLE (Screen 4: /plan)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_day TEXT,
  scheduled_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PLAN EXERCISES TABLE
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

-- 9. PERSONAL RECORDS (PR) TABLE
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

-- 10. INDEXES FOR HIGH-THROUGHPUT RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON public.workouts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON public.workouts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON public.workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise_id ON public.exercise_aliases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_user_id ON public.exercise_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON public.plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON public.personal_records(user_id, lower(exercise_name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_canonical_user 
  ON public.exercises (lower(canonical_name), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_aliases_text_user 
  ON public.exercise_aliases (lower(alias_text), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- 11. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workouts
DROP POLICY IF EXISTS "Users can select own workouts" ON public.workouts;
CREATE POLICY "Users can select own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout Exercises
DROP POLICY IF EXISTS "Users can select own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can select own workout exercises" ON public.workout_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can insert own workout exercises" ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can update own workout exercises" ON public.workout_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users can delete own workout exercises" ON public.workout_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

-- Workout Sets
DROP POLICY IF EXISTS "Users can select own workout sets" ON public.workout_sets;
CREATE POLICY "Users can select own workout sets" ON public.workout_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own workout sets" ON public.workout_sets;
CREATE POLICY "Users can insert own workout sets" ON public.workout_sets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own workout sets" ON public.workout_sets;
CREATE POLICY "Users can update own workout sets" ON public.workout_sets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own workout sets" ON public.workout_sets;
CREATE POLICY "Users can delete own workout sets" ON public.workout_sets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
  ));

-- Exercises
DROP POLICY IF EXISTS "Users can select public or own exercises" ON public.exercises;
CREATE POLICY "Users can select public or own exercises" ON public.exercises FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exercises" ON public.exercises;
CREATE POLICY "Users can insert own exercises" ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own exercises" ON public.exercises;
CREATE POLICY "Users can update own exercises" ON public.exercises FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own exercises" ON public.exercises;
CREATE POLICY "Users can delete own exercises" ON public.exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Exercise Aliases
DROP POLICY IF EXISTS "Users can select public or own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can select public or own aliases" ON public.exercise_aliases FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can insert own aliases" ON public.exercise_aliases FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can update own aliases" ON public.exercise_aliases FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own aliases" ON public.exercise_aliases;
CREATE POLICY "Users can delete own aliases" ON public.exercise_aliases FOR DELETE
  USING (auth.uid() = user_id);

-- Workout Plans
DROP POLICY IF EXISTS "Users can manage own workout plans" ON public.workout_plans;
CREATE POLICY "Users can manage own workout plans" ON public.workout_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Plan Exercises
DROP POLICY IF EXISTS "Users can manage own plan exercises" ON public.plan_exercises;
CREATE POLICY "Users can manage own plan exercises" ON public.plan_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workout_plans wp
    WHERE wp.id = plan_exercises.plan_id AND wp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_plans wp
    WHERE wp.id = plan_exercises.plan_id AND wp.user_id = auth.uid()
  ));

-- Personal Records
DROP POLICY IF EXISTS "Users can manage own personal records" ON public.personal_records;
CREATE POLICY "Users can manage own personal records" ON public.personal_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 13. AUTOMATIC PROFILE TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, preferred_unit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'lbs'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
