-- ====================================================================
-- SUPABASE MIGRATION: Workout Plans, Plan Exercises & Personal Records
-- Run this in Supabase SQL Editor to create the missing plan & PR tables
-- ====================================================================

-- 1. Create Workout Plans table FIRST
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

-- 2. Create Plan Exercises table SECOND (foreign key references workout_plans)
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

-- 3. Create Personal Records table THIRD
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

-- 4. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON public.plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON public.personal_records(user_id, lower(exercise_name));

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- 6. Row Level Security Policies
DROP POLICY IF EXISTS "Users can manage own workout plans" ON public.workout_plans;
CREATE POLICY "Users can manage own workout plans"
  ON public.workout_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users can manage own personal records" ON public.personal_records;
CREATE POLICY "Users can manage own personal records"
  ON public.personal_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Add Stitch Telemetry columns to existing tables
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recognition_mode TEXT NOT NULL DEFAULT 'continuous' CHECK (recognition_mode IN ('continuous', 'push_to_talk')),
  ADD COLUMN IF NOT EXISTS spoken_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS beep_on_record BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS microphone_sensitivity TEXT NOT NULL DEFAULT 'aggressive' CHECK (microphone_sensitivity IN ('quiet', 'standard', 'aggressive')),
  ADD COLUMN IF NOT EXISTS default_rest_timer_seconds INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'ultra' CHECK (tier IN ('free', 'pro', 'ultra'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rest_seconds INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_volume NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_sets_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_url TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_location TEXT;

ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS is_voice_logged BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
