# RepVoice 🏋️‍♂️🎙️

**RepVoice** is a mobile-first, voice-powered gym workout tracker built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL & Auth)**, optimized for seamless deployment on **Vercel**.

Designed for lifters who want hands-free, frictionless set logging between heavy lifts, paired with an electric dark gym aesthetic and real-time database persistence.

---

## ✨ Features

1. **Hands-Free Voice Logging**:
   - Uses the browser's native **Web Speech API** for hands-free workout tracking.
   - Intelligent gym NLP parser translates natural speech (e.g., *"Bench press 60 kilos 10 reps, same weight 10 reps again"*, *"3 sets of 10 with 45 kilos"*, or *"Squat 100 kg 5 reps then 110 kg 5 reps"*) into structured exercises and sets.
   - Spoken numbers are automatically normalized (*"forty five"* → `45`).

2. **Editable Parsing & Pre-Save Review**:
   - Spoken entries display in a review card before adding to your session.
   - Adjust weights or reps with quick `+`/`-` steppers, switch units (`kg`/`lbs`), add sets, or delete erroneous sets.

3. **Manual Fallback Entry**:
   - For browsers without Web Speech support (or loud gym environments), full manual logging is available with quick-add chips and set steppers.

4. **Live Workout Engine & Rest Timer**:
   - Real-time workout duration counter.
   - Built-in Rest Timer (30s, 60s, 90s, 120s presets) with audio beep and haptic feedback to keep rest intervals disciplined.
   - Active workout resilience: workout in progress is protected across accidental browser refreshes.

5. **Supabase PostgreSQL & Row Level Security (RLS)**:
   - Full persistence across devices with relational integrity (`workouts` → `workout_exercises` → `workout_sets`).
   - Secure Row Level Security (RLS) ensures users can **only** access their own workout history.
   - Never exposes secret or service-role keys in browser code.

6. **Workout History & Volume Tracking**:
   - Detailed past logs with total volume moved, duration, exercise breakdown, and 1-tap "Repeat Workout".

---

## 🚀 Supabase Setup Guide

To connect RepVoice to Supabase PostgreSQL and enable cloud sync:

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your database password.

### 2. Run Database Schema Migration
1. Navigate to the **SQL Editor** in your Supabase Dashboard.
2. Click **New Query**.
3. Open and copy the contents of [`supabase/schema.sql`](file:///C:/Users/hp/.gemini/antigravity/scratch/repvoice/supabase/schema.sql).
4. Paste it into the editor and click **Run**.
5. This creates the `profiles`, `workouts`, `workout_exercises`, and `workout_sets` tables, with cascading foreign keys and Row Level Security policies.

### 3. Configure Environment Variables
1. Go to **Project Settings** > **API** in Supabase.
2. Copy your **Project URL** and **Project API Key (`anon` / `public`)**.
3. Create a `.env.local` file in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
*(You can also test directly in the running app via the **Settings** screen!)*

---

## 💻 Local Development

```bash
# Navigate to the project directory
cd C:\Users\hp\.gemini\antigravity\scratch\repvoice

# Install dependencies (if not already installed)
npm install

# Run the development server
npm run dev

# Open http://localhost:3000 in your browser (preferably Chrome, Safari, or Edge for Web Speech API support)
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.
