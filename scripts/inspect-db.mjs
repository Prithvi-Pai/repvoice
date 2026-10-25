import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
let url = '';
let key = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    url = trimmed.split('=')[1].trim();
  } else if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    key = trimmed.split('=')[1].trim();
  }
}

async function query(table) {
  const endpoint = `${url}/rest/v1/${table}?select=*`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(`Table '${table}': status ${res.status}, count: ${Array.isArray(data) ? data.length : 'error'}`, Array.isArray(data) ? data : data);
}

async function run() {
  await query('workouts');
  await query('workout_exercises');
  await query('workout_sets');
  await query('profiles');
  await query('exercises');
  await query('exercise_aliases');
}

run();
